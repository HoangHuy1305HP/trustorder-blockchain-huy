import { getAddress, isAddress, parseEther, ZeroAddress } from 'ethers'

export type Status = 'created' | 'funded' | 'shipped' | 'completed' | 'refunded'
export type Action = 'fund' | 'ship' | 'complete' | 'refund'
export interface Order {
  id: string; title: string; description: string; seller: string; buyer: string
  amount: string; createdAt: number; deadline: number; status: Status
}
export interface NewOrder { title: string; description: string; buyer: string; amount: string; deadline: number }
export const STATUS: Record<Status, string> = {
  created: 'Chờ ký quỹ', funded: 'Đã ký quỹ', shipped: 'Đang giao hàng', completed: 'Hoàn tất', refunded: 'Đã hoàn tiền',
}
export const ACTION: Record<Action, string> = {
  fund: 'Nạp ETH ký quỹ', ship: 'Đánh dấu đã giao', complete: 'Xác nhận đã nhận hàng', refund: 'Yêu cầu hoàn tiền',
}
export function sameAddress(a: string, b: string) { return a.toLowerCase() === b.toLowerCase() }
export function shortAddress(a: string) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : 'Chưa kết nối' }
export function allowedActions(order: Order, account: string, now = Date.now()): Action[] {
  const buyer = sameAddress(order.buyer, account)
  const seller = sameAddress(order.seller, account)
  if (order.status === 'created' && buyer && now < order.deadline) return ['fund']
  if (order.status === 'funded') {
    if (buyer && now >= order.deadline) return ['refund']
    if (seller && now < order.deadline) return ['ship']
  }
  if (order.status === 'shipped' && buyer) return ['complete']
  return []
}
export function validateOrder(input: NewOrder, seller: string, now = Date.now()) {
  if (!input.title.trim() || input.title.trim().length > 100) throw new Error('Tên đơn hàng cần từ 1 đến 100 ký tự.')
  if (input.description.length > 1000) throw new Error('Mô tả tối đa 1.000 ký tự.')
  if (!isAddress(input.buyer) || input.buyer === ZeroAddress) throw new Error('Địa chỉ ví người mua không hợp lệ.')
  if (sameAddress(input.buyer, seller)) throw new Error('Ví người mua phải khác ví người bán.')
  getAddress(input.buyer)
  try { if (parseEther(input.amount) <= 0n) throw new Error() }
  catch { throw new Error('Số ETH phải lớn hơn 0, tối đa 18 chữ số thập phân.') }
  if (!Number.isFinite(input.deadline) || input.deadline <= now) throw new Error('Hạn giao hàng phải ở tương lai.')
}
export function errorMessage(error: unknown): string {
  const e = error as { code?: string | number; shortMessage?: string; reason?: string; message?: string }
  if (e?.code === 4001 || e?.code === 'ACTION_REJECTED') return 'Bạn đã từ chối yêu cầu trong ví. Chưa có giao dịch được xác nhận.'
  if (e?.code === -32002) return 'Có một yêu cầu đang chờ trong MetaMask. Hãy mở ví để xử lý.'
  if (e?.code === 'INSUFFICIENT_FUNDS') return 'Ví không đủ ETH cho giá trị giao dịch và phí gas.'
  if (e?.code === 'CALL_EXCEPTION') return `Contract từ chối thao tác: ${e.reason || 'kiểm tra quyền, trạng thái và thời hạn đơn hàng.'}`
  return e?.reason || e?.shortMessage || e?.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại.'
}
