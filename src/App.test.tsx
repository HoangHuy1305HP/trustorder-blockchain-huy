import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { DEMO_BUYER, DEMO_SELLER } from './services/demo'

beforeEach(() => { vi.stubGlobal('scrollTo', vi.fn()); localStorage.clear(); location.hash = '/orders' })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
async function navigate(path: string) { await act(async () => { location.hash = path; window.dispatchEvent(new HashChangeEvent('hashchange')) }) }
it('thực hiện toàn bộ giao dịch qua UI với hai vai trò', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText('Bàn phím cơ Keychron K2')
  await user.selectOptions(screen.getByLabelText('Ví demo'), DEMO_SELLER)
  await navigate('/create')
  await user.type(screen.getByLabelText('Tên đơn hàng'), 'Sách Blockchain')
  expect((screen.getByLabelText(/Địa chỉ ví người mua/) as HTMLInputElement).value).toBe(DEMO_BUYER)
  await user.type(screen.getByLabelText('Giá trị ký quỹ (ETH)'), '0.01')
  await user.type(screen.getByLabelText('Hạn giao hàng'), '2099-12-01T12:00')
  await user.click(screen.getByRole('button', { name: 'Kiểm tra thông tin' }))
  await user.click(screen.getByRole('button', { name: 'Xác nhận tạo đơn' }))
  await waitFor(() => expect(location.hash).toBe('#/orders'), { timeout: 3000 })
  await screen.findByText('Sách Blockchain')
  await user.selectOptions(screen.getByLabelText('Ví demo'), DEMO_BUYER)
  await navigate('/orders/6')
  await user.click(screen.getByRole('button', { name: 'Nạp ETH ký quỹ' }))
  await user.click(screen.getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Nạp ETH ký quỹ' })).toBeNull(), { timeout: 3000 })
  await user.selectOptions(screen.getByLabelText('Ví demo'), DEMO_SELLER)
  await user.click(await screen.findByRole('button', { name: 'Đánh dấu đã giao' }))
  await user.click(screen.getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Đánh dấu đã giao' })).toBeNull(), { timeout: 3000 })
  await user.selectOptions(screen.getByLabelText('Ví demo'), DEMO_BUYER)
  await user.click(await screen.findByRole('button', { name: 'Xác nhận đã nhận hàng' }))
  await user.click(screen.getByRole('button', { name: 'Xác nhận' }))
  await screen.findByText('Đã giải ngân cho người bán.', {}, { timeout: 3000 })
  expect(screen.queryByRole('button', { name: 'Xác nhận đã nhận hàng' })).toBeNull()
}, 20000)

it('tìm kiếm và hiển thị empty state', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText('Bàn phím cơ Keychron K2')
  await user.type(screen.getByLabelText('Tìm đơn hàng'), 'không có đơn này')
  expect(screen.getByText('Chưa có đơn hàng phù hợp')).toBeTruthy()
})

it('MetaMask chưa cài: báo rõ lỗi và có thể quay lại demo', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText('Bàn phím cơ Keychron K2')
  await user.click(screen.getByRole('button', { name: 'MetaMask' }))
  await screen.findByText(/Chưa tìm thấy MetaMask/)
  expect(screen.queryByText('Bàn phím cơ Keychron K2')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Demo' }))
  await screen.findByText('Bàn phím cơ Keychron K2')
})
