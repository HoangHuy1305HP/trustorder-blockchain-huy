import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseEther } from 'ethers'
import { DEMO_BUYER as buyer, DEMO_SELLER as seller, DEMO_OBSERVER as observer, demoService as service, resetDemo } from './demo'
const progress = vi.fn()
async function finish<T>(promise: Promise<T>) {
  // Attach rejection handlers immediately to avoid an unhandled-rejection window with fake timers.
  const result = promise.then(value => ({ value }), error => ({ error }))
  await vi.runAllTimersAsync()
  const outcome = await result
  if ('error' in outcome) throw outcome.error
  return outcome.value
}
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); resetDemo() })
afterEach(() => vi.useRealTimers())
describe('Demo ledger', () => {
  it('tạo → nạp → giao → nhận: bảo toàn số ETH và không trả hai lần', async () => {
    const buyerBefore = parseEther(await service.balance(buyer))
    const sellerBefore = parseEther(await service.balance(seller))
    await finish(service.create({ title: 'Sách', description: '', buyer, amount: '0.01', deadline: Date.now() + 3600000 }, seller, progress))
    let order = (await service.list()).at(-1)!
    await finish(service.act('fund', order, buyer, progress))
    expect(parseEther(await service.balance(buyer))).toBe(buyerBefore - parseEther('0.01'))
    order = (await service.list()).at(-1)!
    await finish(service.act('ship', order, seller, progress))
    order = (await service.list()).at(-1)!
    await finish(service.act('complete', order, buyer, progress))
    expect(parseEther(await service.balance(seller))).toBe(sellerBefore + parseEther('0.01'))
    await expect(finish(service.act('complete', order, buyer, progress))).rejects.toThrow()
    expect(parseEther(await service.balance(seller))).toBe(sellerBefore + parseEther('0.01'))
  })
  it('hoàn tiền đơn quá hạn và chống dùng trạng thái cũ để nhận lần nữa', async () => {
    const order = (await service.list()).find(o => o.id === '5')!
    const before = parseEther(await service.balance(buyer))
    await finish(service.act('refund', order, buyer, progress))
    expect(parseEther(await service.balance(buyer))).toBe(before + parseEther('0.04'))
    await expect(finish(service.act('refund', order, buyer, progress))).rejects.toThrow()
  })
  it('chặn người xem gọi trực tiếp service', async () => {
    const order = (await service.list())[0]
    await expect(finish(service.act('fund', order, observer, progress))).rejects.toThrow()
    expect((await service.list())[0].status).toBe('created')
  })
  it('đọc dữ liệu mới để tránh nạp lặp đồng thời', async () => {
    const order = (await service.list())[0]
    const before = parseEther(await service.balance(buyer))
    const outcomes = Promise.allSettled([service.act('fund', order, buyer, progress), service.act('fund', order, buyer, progress)])
    await vi.runAllTimersAsync()
    expect((await outcomes).filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(parseEther(await service.balance(buyer))).toBe(before - parseEther(order.amount))
  })
  it('giữ chính xác giao dịch 1 wei', async () => {
    await finish(service.create({ title: 'Một wei', description: '', buyer, amount: '0.000000000000000001', deadline: Date.now() + 100000 }, seller, progress))
    const before = parseEther(await service.balance(buyer))
    await finish(service.act('fund', (await service.list()).at(-1)!, buyer, progress))
    expect(parseEther(await service.balance(buyer))).toBe(before - 1n)
  })
  it('phục hồi được kho lỗi bằng reset', async () => {
    localStorage.setItem('trustorder.demo.v1', 'invalid-json')
    await expect(service.list()).rejects.toThrow('Dữ liệu demo bị lỗi')
    resetDemo()
    expect(await service.list()).toHaveLength(5)
  })
})
