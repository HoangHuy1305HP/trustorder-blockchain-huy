import { formatEther, parseEther } from 'ethers'
import { allowedActions, validateOrder, type Action, type NewOrder, type Order } from '../domain'
import type { OrderService, TxProgress } from './types'

export const DEMO_SELLER = '0x1111111111111111111111111111111111111111'
export const DEMO_BUYER = '0x2222222222222222222222222222222222222222'
export const DEMO_OBSERVER = '0x3333333333333333333333333333333333333333'
const KEY = 'trustorder.demo.v1'
type DemoState = { orders: Order[]; balances: Record<string, string> }
function seed(): DemoState {
  const now = Date.now()
  const base = { seller: DEMO_SELLER, buyer: DEMO_BUYER, createdAt: now - 86400000, description: 'Dữ liệu mẫu cho bài tập lớn. Chỉ mô phỏng, không chuyển ETH thật.' }
  return {
    orders: [
      { ...base, id: '1', title: 'Bàn phím cơ Keychron K2', amount: '0.025', status: 'created', deadline: now + 3 * 86400000 },
      { ...base, id: '2', title: 'Tai nghe Sony WH-1000XM5', amount: '0.08', status: 'funded', deadline: now + 2 * 86400000 },
      { ...base, id: '3', title: 'Màn hình Dell UltraSharp 27”', amount: '0.12', status: 'shipped', deadline: now + 86400000 },
      { ...base, id: '4', title: 'Chuột Logitech MX Master 3S', amount: '0.035', status: 'completed', deadline: now - 86400000 },
      { ...base, id: '5', title: 'Ổ cứng Samsung T7 1TB', amount: '0.04', status: 'funded', deadline: now - 3600000 },
    ],
    balances: { [DEMO_SELLER]: '10.035', [DEMO_BUYER]: '9.725', [DEMO_OBSERVER]: '10' },
  }
}
function read(): DemoState {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try {
      const state = JSON.parse(raw) as DemoState
      if (!Array.isArray(state.orders) || !state.balances) throw new Error()
      return state
    } catch { throw new Error('Dữ liệu demo bị lỗi. Dùng “Khôi phục dữ liệu mẫu” trong Hướng dẫn.') }
  }
  const state = seed(); localStorage.setItem(KEY, JSON.stringify(state)); return state
}
export function resetDemo() { localStorage.setItem(KEY, JSON.stringify(seed())) }
async function simulate(progress: TxProgress) {
  progress('signing')
  await new Promise(resolve => setTimeout(resolve, 250))
  progress('pending', 'demo-' + crypto.randomUUID())
  await new Promise(resolve => setTimeout(resolve, 450))
}
export const demoService: OrderService = {
  async list() { return read().orders },
  async balance(account) { return read().balances[account.toLowerCase()] || '10' },
  async create(input: NewOrder, account: string, progress: TxProgress) {
    validateOrder(input, account)
    await simulate(progress)
    validateOrder(input, account)
    const state = read()
    const id = String(Math.max(0, ...state.orders.map(o => Number(o.id))) + 1)
    state.orders.push({ ...input, title: input.title.trim(), seller: account, buyer: input.buyer.toLowerCase(), createdAt: Date.now(), id, status: 'created' })
    localStorage.setItem(KEY, JSON.stringify(state))
  },
  async act(action: Action, order: Order, account: string, progress: TxProgress) {
    await simulate(progress)
    const state = read()
    const current = state.orders.find(o => o.id === order.id)
    if (!current || !allowedActions(current, account).includes(action)) throw new Error('Thao tác không còn hợp lệ với vai trò, thời hạn hoặc trạng thái hiện tại.')
    const amount = parseEther(current.amount)
    const key = account.toLowerCase()
    if (action === 'fund') {
      const balance = parseEther(state.balances[key] || '10')
      if (balance < amount) throw new Error('Ví demo không đủ ETH.')
      state.balances[key] = formatEther(balance - amount)
    }
    if (action === 'refund' || action === 'complete') {
      const recipient = (action === 'refund' ? current.buyer : current.seller).toLowerCase()
      state.balances[recipient] = formatEther(parseEther(state.balances[recipient] || '10') + amount)
    }
    current.status = ({ fund: 'funded', ship: 'shipped', complete: 'completed', refund: 'refunded' } as const)[action]
    localStorage.setItem(KEY, JSON.stringify(state))
  },
}
