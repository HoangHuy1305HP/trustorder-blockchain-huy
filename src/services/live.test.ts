import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseEther } from 'ethers'
import { DEMO_BUYER as buyer, DEMO_SELLER as seller } from './demo'

const mocks = vi.hoisted(() => ({ contract: { getOrder: vi.fn(), orderCount: vi.fn(), fundOrder: vi.fn(), markShipped: vi.fn(), confirmReceived: vi.fn(), refundOrder: vi.fn(), createOrder: vi.fn() }, network: vi.fn(), code: vi.fn(), signer: vi.fn(), check: vi.fn() }))
vi.mock('../config', () => ({ config: { chainId: 31337, address: '0x4444444444444444444444444444444444444444' }, checkConfig: mocks.check }))
vi.mock('./wallet', () => ({ injected: () => ({ request: vi.fn() }) }))
vi.mock('ethers', async importOriginal => {
  const actual = await importOriginal<typeof import('ethers')>()
  return { ...actual, BrowserProvider: class {
    getNetwork = mocks.network
    getCode = mocks.code
    getSigner = mocks.signer
  }, Contract: class { constructor() { return mocks.contract } } }
})
import { liveService, mapOrder } from './live'
const raw = () => ({ id: 1n, title: 'Sách', description: '', seller, buyer, amount: parseEther('0.01'), createdAt: 100n, deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), status: 0n })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.network.mockResolvedValue({ chainId: 31337n })
  mocks.code.mockResolvedValue('0x1234')
  mocks.signer.mockResolvedValue({ getAddress: async () => buyer })
  mocks.contract.getOrder.mockResolvedValue(raw())
})
describe('Live adapter — proposed ABI', () => {
  it('ánh xạ wei và Unix seconds; từ chối enum chưa biết', () => {
    expect(mapOrder(raw())).toMatchObject({ id: '1', amount: '0.01', createdAt: 100000, status: 'created' })
    expect(() => mapOrder({ ...raw(), status: 99n })).toThrow('chưa được ánh xạ')
  })
  it('gửi đúng value bigint và đợi receipt trước khi hoàn tất', async () => {
    const wait = vi.fn().mockResolvedValue({ status: 1 })
    mocks.contract.fundOrder.mockResolvedValue({ hash: '0xabc', wait })
    const progress = vi.fn()
    await liveService.act('fund', mapOrder(raw()), buyer, progress)
    expect(mocks.contract.fundOrder).toHaveBeenCalledWith(1n, { value: parseEther('0.01') })
    expect(wait).toHaveBeenCalledWith(1)
    expect(progress.mock.calls).toEqual([['signing'], ['pending', '0xabc']])
  })
  it('không thành công nếu receipt failed', async () => {
    mocks.contract.fundOrder.mockResolvedValue({ hash: '0xabc', wait: async () => ({ status: 0 }) })
    await expect(liveService.act('fund', mapOrder(raw()), buyer, vi.fn())).rejects.toThrow('chưa được xác nhận')
  })
  it('xử lý replacement thành công nhưng không coi cancel là thành công', async () => {
    const replacement = { code: 'TRANSACTION_REPLACED', cancelled: false, receipt: { status: 1, hash: '0xnew' } }
    mocks.contract.fundOrder.mockResolvedValue({ hash: '0xold', wait: async () => { throw replacement } })
    const progress = vi.fn()
    await liveService.act('fund', mapOrder(raw()), buyer, progress)
    expect(progress).toHaveBeenLastCalledWith('pending', '0xnew')
    replacement.cancelled = true
    await expect(liveService.act('fund', mapOrder(raw()), buyer, vi.fn())).rejects.toEqual(replacement)
  })
  it('chặn sai mạng và địa chỉ không có bytecode', async () => {
    mocks.network.mockResolvedValue({ chainId: 1n })
    await expect(liveService.list()).rejects.toThrow('Sai mạng')
    mocks.network.mockResolvedValue({ chainId: 31337n })
    mocks.code.mockResolvedValue('0x')
    await expect(liveService.list()).rejects.toThrow('Không có contract')
  })
  it('đọc lại state để chặn hoàn tiền đã giao', async () => {
    const shipped = { ...raw(), status: 2n }
    mocks.contract.getOrder.mockResolvedValue(shipped)
    await expect(liveService.act('refund', mapOrder(raw()), buyer, vi.fn())).rejects.toThrow('không hợp lệ')
    expect(mocks.contract.refundOrder).not.toHaveBeenCalled()
  })
  it('đọc ID theo giao diện đề xuất và chặn danh sách vượt giới hạn', async () => {
    mocks.contract.orderCount.mockResolvedValue(2n)
    expect(await liveService.list()).toHaveLength(2)
    expect(mocks.contract.getOrder).toHaveBeenCalledWith(1)
    expect(mocks.contract.getOrder).toHaveBeenCalledWith(2)
    mocks.contract.orderCount.mockResolvedValue(1001n)
    await expect(liveService.list()).rejects.toThrow('phân trang')
  })
})
