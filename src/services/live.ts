import { BrowserProvider, Contract, formatEther, getAddress, parseEther, type ContractTransactionResponse } from 'ethers'
import { checkConfig, config } from '../config'
import { escrowAbi } from '../contracts/escrowAbi'
import { allowedActions, sameAddress, validateOrder, type Order, type Status } from '../domain'
import { injected } from './wallet'
import type { OrderService, TxProgress } from './types'

const states: Status[] = ['created', 'funded', 'shipped', 'completed', 'refunded']
async function connection(account?: string) {
  checkConfig()
  const provider = new BrowserProvider(injected())
  if (Number((await provider.getNetwork()).chainId) !== config.chainId) throw new Error(`Sai mạng. Hãy chuyển sang chain ${config.chainId}.`)
  if (await provider.getCode(config.address) === '0x') throw new Error('Không có contract tại địa chỉ đã cấu hình trên mạng này.')
  const runner = account ? await provider.getSigner(account) : provider
  if (account && !sameAddress(await (await provider.getSigner()).getAddress(), account)) throw new Error('Ví đã thay đổi. Hãy tải lại dữ liệu trước khi giao dịch.')
  return { provider, contract: new Contract(getAddress(config.address), escrowAbi, runner) }
}
// Only this mapping and the ABI need adapting if Hùng uses different field names/order/status codes.
export function mapOrder(raw: Record<string, unknown>): Order {
  const state = states[Number(raw.status)]
  if (!state) throw new Error('Trạng thái contract chưa được ánh xạ. Kiểm tra ABI và mapOrder().')
  return {
    id: String(raw.id), title: String(raw.title), description: String(raw.description),
    seller: String(raw.seller), buyer: String(raw.buyer), amount: formatEther(BigInt(String(raw.amount))),
    createdAt: Number(raw.createdAt) * 1000, deadline: Number(raw.deadline) * 1000, status: state,
  }
}
async function confirm(send: () => Promise<ContractTransactionResponse>, progress: TxProgress) {
  progress('signing')
  const tx = await send()
  progress('pending', tx.hash)
  try {
    const receipt = await tx.wait(1)
    if (!receipt || receipt.status !== 1) throw new Error('Giao dịch chưa được xác nhận thành công.')
  } catch (error) {
    const e = error as { code?: string; cancelled?: boolean; receipt?: { status: number; hash: string } }
    if (e.code !== 'TRANSACTION_REPLACED' || e.cancelled || e.receipt?.status !== 1) throw error
    progress('pending', e.receipt.hash)
  }
}
export const liveService: OrderService = {
  async list() {
    const { contract } = await connection()
    const count = BigInt(await contract.orderCount())
    if (count > 1000n) throw new Error('Contract có hơn 1.000 đơn. Cần bổ sung API phân trang trước khi tải danh sách.')
    const orders: Order[] = []
    // Proposed IDs begin at 1. Read in batches to avoid flooding the wallet provider.
    for (let start = 1; start <= Number(count); start += 20) {
      const ids = Array.from({ length: Math.min(20, Number(count) - start + 1) }, (_, index) => start + index)
      orders.push(...await Promise.all(ids.map(async id => mapOrder(await contract.getOrder(id)))))
    }
    return orders
  },
  async balance(account) {
    const provider = new BrowserProvider(injected())
    return formatEther(await provider.getBalance(account))
  },
  async create(input, account, progress) {
    validateOrder(input, account)
    const { contract } = await connection(account)
    await confirm(() => contract.createOrder(input.title.trim(), input.description, getAddress(input.buyer), parseEther(input.amount), Math.floor(input.deadline / 1000)), progress)
  },
  async act(action, order, account, progress) {
    const { contract } = await connection(account)
    const current = mapOrder(await contract.getOrder(BigInt(order.id)))
    if (!allowedActions(current, account).includes(action)) throw new Error('Thao tác không hợp lệ với trạng thái, thời hạn hoặc vai trò hiện tại.')
    await confirm(() => {
      const id = BigInt(order.id)
      switch (action) {
        case 'fund': return contract.fundOrder(id, { value: parseEther(current.amount) })
        case 'ship': return contract.markShipped(id)
        case 'complete': return contract.confirmReceived(id)
        case 'refund': return contract.refundOrder(id)
      }
    }, progress)
  },
}
