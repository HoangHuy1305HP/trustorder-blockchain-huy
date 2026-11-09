import { describe, expect, it } from 'vitest'
import { allowedActions, errorMessage, validateOrder, type NewOrder, type Order, type Status } from './domain'
import { DEMO_BUYER as buyer, DEMO_SELLER as seller, DEMO_OBSERVER as observer } from './services/demo'

const now = 1000000
const order: Order = { id: '1', title: 'Sách', description: '', buyer, seller, amount: '0.1', createdAt: 0, deadline: now, status: 'created' }
const input: NewOrder = { title: 'Sách', description: '', buyer, amount: '0.000000000000000001', deadline: now + 1000 }
describe('Quyền và thời hạn', () => {
  it('chỉ buyer nạp trước hạn; chặn đúng biên deadline', () => {
    expect(allowedActions(order, buyer, now - 1)).toEqual(['fund'])
    expect(allowedActions(order, buyer, now)).toEqual([])
    expect(allowedActions(order, seller, now - 1)).toEqual([])
  })
  it('chỉ seller giao trước hạn; buyer hoàn tiền từ thời điểm hạn', () => {
    const funded = { ...order, status: 'funded' as const }
    expect(allowedActions(funded, seller, now - 1)).toEqual(['ship'])
    expect(allowedActions(funded, seller, now)).toEqual([])
    expect(allowedActions(funded, buyer, now - 1)).toEqual([])
    expect(allowedActions(funded, buyer, now)).toEqual(['refund'])
  })
  it('đã giao chỉ buyer nhận; không tự thêm refund sau giao', () => {
    const shipped = { ...order, status: 'shipped' as const }
    expect(allowedActions(shipped, buyer, now + 1000)).toEqual(['complete'])
    expect(allowedActions(shipped, seller, now + 1000)).toEqual([])
  })
  it.each<Status>(['created', 'funded', 'shipped', 'completed', 'refunded'])('người xem không được thao tác với %s', status => {
    expect(allowedActions({ ...order, status }, observer, now)).toEqual([])
  })
  it.each<Status>(['completed', 'refunded'])('trạng thái kết thúc %s không cho thao tác thêm', status => {
    expect(allowedActions({ ...order, status }, buyer, now)).toEqual([])
    expect(allowedActions({ ...order, status }, seller, now)).toEqual([])
  })
})
describe('Validation', () => {
  it('chấp nhận 1 wei chính xác', () => expect(() => validateOrder(input, seller, now)).not.toThrow())
  it.each(['0', '-1', 'NaN', '1e-3', '0.0000000000000000001'])('từ chối ETH %s', amount => expect(() => validateOrder({ ...input, amount }, seller, now)).toThrow())
  it.each(['0x123', seller, '0x0000000000000000000000000000000000000000'])('từ chối buyer %s', address => expect(() => validateOrder({ ...input, buyer: address }, seller, now)).toThrow())
  it('không nhận thời hạn đúng hiện tại hoặc quá khứ', () => {
    expect(() => validateOrder({ ...input, deadline: now }, seller, now)).toThrow()
    expect(() => validateOrder({ ...input, deadline: NaN }, seller, now)).toThrow()
  })
  it('từ chối tiêu đề trống và mô tả quá dài', () => {
    expect(() => validateOrder({ ...input, title: '  ' }, seller, now)).toThrow()
    expect(() => validateOrder({ ...input, description: 'x'.repeat(1001) }, seller, now)).toThrow()
  })
  it('giải thích lỗi ví và revert', () => {
    expect(errorMessage({ code: 4001 })).toContain('từ chối')
    expect(errorMessage({ code: 'ACTION_REJECTED' })).toContain('từ chối')
    expect(errorMessage({ code: 'INSUFFICIENT_FUNDS' })).toContain('không đủ ETH')
    expect(errorMessage({ code: 'CALL_EXCEPTION', reason: 'NotBuyer' })).toContain('NotBuyer')
  })
})
