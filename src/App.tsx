import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BookOpen, Box, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Copy, ExternalLink, FlaskConical, LayoutDashboard, LoaderCircle, Plus, RefreshCw, Search, ShieldCheck, Wallet, X } from 'lucide-react'
import { formatEther, parseEther } from 'ethers'
import { config } from './config'
import { ACTION, STATUS, allowedActions, errorMessage, sameAddress, shortAddress, validateOrder, type Action, type NewOrder, type Status } from './domain'
import { DEMO_BUYER, DEMO_OBSERVER, DEMO_SELLER, resetDemo } from './services/demo'
import { useEscrow } from './useEscrow'

type Escrow = ReturnType<typeof useEscrow>
const date = (value: number) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
const eth = (value: string) => {
  const [whole, decimals] = value.split('.')
  const fraction = decimals?.replace(/0+$/, '')
  return new Intl.NumberFormat('en-US').format(BigInt(whole)) + (fraction ? `.${fraction}` : '')
}
function usePath() {
  const [path, setPath] = useState(location.hash.slice(1) || '/orders')
  useEffect(() => { const handler = () => setPath(location.hash.slice(1) || '/orders'); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler) }, [])
  return path
}
function Badge({ status }: { status: Status }) { return <span className={`badge ${status}`}><span />{STATUS[status]}</span> }
function Address({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return <button className="address" title={value} onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true) } catch { setCopied(false) } }} aria-label={`Sao chép địa chỉ ${value}`}><span>{shortAddress(value)}</span>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
}
function TransactionNotice({ app }: { app: Escrow }) {
  const tx = app.transaction
  if (!tx) return null
  const busy = tx.phase === 'signing' || tx.phase === 'pending'
  return <section className={`transaction ${tx.phase}`} role="status" aria-live="polite">
    {busy ? <LoaderCircle className="spin" size={20} /> : tx.phase === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
    <div><strong>{tx.label} · {({ signing: app.mode === 'demo' ? 'Đang mô phỏng' : 'Chờ xác nhận trong MetaMask', pending: 'Đang chờ xác nhận', success: app.mode === 'demo' ? 'Mô phỏng thành công' : 'Đã xác nhận trên blockchain', failed: 'Không thành công' })[tx.phase]}</strong>
      {tx.error && <p>{tx.error}</p>}{tx.hash && <p className="break-all">{app.mode === 'demo' ? 'Mã mô phỏng: ' : 'Transaction: '}{tx.hash}</p>}
    </div>{!busy && <button className="icon-button" aria-label="Đóng thông báo giao dịch" onClick={() => app.setTransaction(null)}><X size={17} /></button>}
  </section>
}
function Overview({ app }: { app: Escrow }) {
  const held = app.orders.filter(o => o.status === 'funded' || o.status === 'shipped').reduce((sum, o) => sum + parseEther(o.amount), 0n)
  const stats = [
    { title: 'Tổng đơn hàng', value: app.orders.length, note: 'Trên mạng đang chọn', icon: Box, className: 'blue' },
    { title: 'ETH đang ký quỹ', value: eth(formatEther(held)), note: 'Đã nạp, chưa giải ngân', icon: ShieldCheck, className: 'purple' },
    { title: 'Đang giao hàng', value: app.orders.filter(o => o.status === 'shipped').length, note: 'Chờ người mua xác nhận', icon: ArrowUpRight, className: 'orange' },
    { title: 'Đơn hoàn tất', value: app.orders.filter(o => o.status === 'completed').length, note: 'Đã chuyển ETH cho người bán', icon: CheckCircle2, className: 'green' },
  ]
  return <div className="stats">{stats.map(({ title, value, note, icon: Icon, className }) => <section className="stat" key={title}><div className="stat-top"><span>{title}</span><span className={`stat-icon ${className}`}><Icon size={18} /></span></div><strong>{app.loading ? '—' : value}</strong><p>{note}</p></section>)}</div>
}
function OrderList({ app }: { app: Escrow }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [scope, setScope] = useState('all')
  const rows = [...app.orders].reverse().filter(o => (status === 'all' || o.status === status) && (scope === 'all' || sameAddress(scope === 'buy' ? o.buyer : o.seller, app.account)) && `${o.title} ${o.id} ${o.buyer} ${o.seller}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <div className="page-heading"><div><div className="eyebrow">KHÔNG GIAN LÀM VIỆC</div><h1>Đơn hàng của bạn</h1><p>Theo dõi giao dịch. Kiểm soát từng bước ký quỹ.</p></div><a className="button primary" href="#/create"><Plus size={17} />Tạo đơn hàng</a></div>
    <Overview app={app} />
    <section className="panel orders-panel">
      <div className="panel-heading"><div><h2>Danh sách đơn hàng <span className="count">{rows.length}</span></h2><p>Mọi giao dịch, trong một góc nhìn.</p></div><button className="button small" onClick={() => void app.refresh()} disabled={app.loading || app.busy}><RefreshCw size={14} className={app.loading ? 'spin' : ''} />Làm mới</button></div>
      <div className="filters"><label className="search"><Search size={17} /><input placeholder="Tìm tên, mã đơn hoặc địa chỉ ví…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Tìm đơn hàng" /></label><select aria-label="Lọc trạng thái" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Lọc vai trò" value={scope} onChange={e => setScope(e.target.value)}><option value="all">Tất cả vai trò</option><option value="buy">Tôi là người mua</option><option value="sell">Tôi là người bán</option></select></div>
      <div className="table-scroll"><table><thead><tr><th>ĐƠN HÀNG</th><th>GIÁ TRỊ</th><th>VAI TRÒ CỦA BẠN</th><th>TRẠNG THÁI</th><th>HẠN GIAO HÀNG</th><th><span className="sr-only">Chi tiết</span></th></tr></thead><tbody>{rows.map(o => <tr key={o.id}><td><a className="order-title" href={`#/orders/${o.id}`}><span className="product-icon"><Box size={19} /></span><span><strong>{o.title}</strong><small>Đơn #{o.id.padStart(3, '0')}</small></span></a></td><td><strong className="amount">{eth(o.amount)} <span>ETH</span></strong></td><td><span className="role">{sameAddress(o.buyer, app.account) ? <><ArrowDownLeft size={14} />Người mua</> : sameAddress(o.seller, app.account) ? <><ArrowUpRight size={14} />Người bán</> : 'Người xem'}</span></td><td><Badge status={o.status} /></td><td className="deadline">{date(o.deadline)}</td><td><a href={`#/orders/${o.id}`} className="icon-button" aria-label={`Chi tiết đơn ${o.id}`}><ChevronRight size={17} /></a></td></tr>)}</tbody></table></div>
      {app.loading ? <div className="empty"><LoaderCircle className="spin" size={24} /><p>Đang tải đơn hàng…</p></div> : !rows.length && <div className="empty"><Box size={32} /><h3>{app.mode === 'live' && !app.account ? 'Kết nối ví để bắt đầu' : app.error ? 'Chưa tải được dữ liệu' : 'Chưa có đơn hàng phù hợp'}</h3><p>{app.error ? 'Kiểm tra thông báo lỗi phía trên rồi thử làm mới.' : 'Thử thay đổi bộ lọc hoặc tạo một đơn hàng mới.'}</p></div>}
      <div className="table-footer"><span>Hiển thị {rows.length} / {app.orders.length} đơn hàng</span><span><span className="live-dot" />{app.mode === 'demo' ? 'Dữ liệu mô phỏng trên trình duyệt' : 'Đồng bộ mỗi 15 giây'}</span></div>
    </section>
    <section className="workflow-strip"><ShieldCheck size={26} /><div><strong>Giao dịch rõ ràng, từ đầu đến cuối.</strong><p>Tạo đơn <ArrowRight /> Nạp ký quỹ <ArrowRight /> Giao hàng <ArrowRight /> Xác nhận & giải ngân</p></div><a href="#/guide">Tìm hiểu luồng giao dịch <ArrowRight size={15} /></a></section>
  </>
}
function CreateOrder({ app }: { app: Escrow }) {
  const [error, setError] = useState('')
  const [input, setInput] = useState({ title: '', description: '', buyer: app.mode === 'demo' ? DEMO_BUYER : '', amount: '', deadline: '' })
  const [review, setReview] = useState<NewOrder | null>(null)
  function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    try {
      const order = { ...input, deadline: new Date(input.deadline).getTime() }
      validateOrder(order, app.account)
      setReview(order)
    } catch (e) { setError(errorMessage(e)) }
  }
  return <>
    <a href="#/orders" className="back-link"><ChevronLeft size={16} />Danh sách đơn hàng</a>
    <div className="page-heading"><div><div className="eyebrow">BẮT ĐẦU GIAO DỊCH</div><h1>Tạo đơn hàng mới</h1><p>Bạn là người bán. ETH sẽ được người mua nạp sau khi tạo đơn.</p></div></div>
    <div className="content-grid"><section className="panel form-panel"><h2>Thông tin đơn hàng</h2>
      {!app.account || app.wrongNetwork ? <div className="inline-note">Hãy kết nối ví và chọn đúng mạng trước khi tạo đơn.</div> : <form onSubmit={submit}>
        <label>Tên đơn hàng<input required maxLength={100} placeholder="Ví dụ: Bàn phím cơ Keychron K2" value={input.title} disabled={app.busy} onChange={e => { setReview(null); setInput({ ...input, title: e.target.value }) }} /></label>
        <label>Mô tả <span className="optional">(không bắt buộc)</span><textarea rows={3} maxLength={1000} placeholder="Thông tin sản phẩm và thỏa thuận giao nhận…" value={input.description} disabled={app.busy} onChange={e => { setReview(null); setInput({ ...input, description: e.target.value }) }} /></label>
        <label>Địa chỉ ví người mua<input required placeholder="0x…" value={input.buyer} disabled={app.busy} onChange={e => { setReview(null); setInput({ ...input, buyer: e.target.value.trim() }) }} /><small>Chỉ ví này có thể nạp ETH, xác nhận nhận hàng và yêu cầu hoàn tiền.</small></label>
        <div className="form-row"><label>Giá trị ký quỹ (ETH)<input required type="text" inputMode="decimal" placeholder="0.025" value={input.amount} disabled={app.busy} onChange={e => { setReview(null); setInput({ ...input, amount: e.target.value }) }} /></label><label>Hạn giao hàng<input required type="datetime-local" value={input.deadline} disabled={app.busy} onChange={e => { setReview(null); setInput({ ...input, deadline: e.target.value }) }} /></label></div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button className="button primary" disabled={app.busy} type="submit">Kiểm tra thông tin<ArrowRight size={16} /></button>
      </form>}
      {review && <div className="review"><h3>Xác nhận tạo đơn</h3><p><strong>{review.title}</strong> · {review.amount} ETH</p><p className="break-all">Người bán: {app.account}<br />Người mua: {review.buyer}</p><p>Hạn: {date(review.deadline)}</p><p>{app.mode === 'demo' ? 'Thao tác được mô phỏng trên trình duyệt.' : 'Bạn sẽ ký giao dịch tạo đơn và trả phí gas. Chưa nạp ETH ký quỹ ở bước này.'}</p><button className="button primary" disabled={app.busy || app.wrongNetwork || !app.account} onClick={async () => { if (await app.create(review)) location.hash = '/orders' }}>{app.busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Xác nhận tạo đơn</button></div>}
    </section><aside className="panel side-note"><span className="note-icon"><ShieldCheck size={26} /></span><h2>Một đơn hàng, một thỏa thuận</h2><p>Kiểm tra đúng ví người mua và số ETH trước khi ký. Thông tin đã ghi vào contract có thể không chỉnh sửa được.</p><hr /><h3>Điều kiện hoàn tiền đề xuất</h3><p>Người mua chỉ được hoàn tiền khi đơn đã ký quỹ, quá hạn và người bán chưa đánh dấu giao hàng.</p><p className="muted">Quy tắc này cần được thống nhất với Hùng và thực thi trong smart contract.</p></aside></div>
  </>
}
function Detail({ app, id, now }: { app: Escrow; id: string; now: number }) {
  const order = app.orders.find(o => o.id === id)
  const [confirmation, setConfirmation] = useState<Action | null>(null)
  useEffect(() => setConfirmation(null), [id, app.account, app.mode, order?.status])
  if (!order) return <section className="panel empty"><Box size={32} /><h2>{app.loading ? 'Đang tải đơn hàng…' : 'Chưa tìm thấy đơn hàng'}</h2><p>Kiểm tra ví, mạng, cấu hình contract hoặc quay lại danh sách.</p><a className="button" href="#/orders">Về danh sách</a></section>
  const available = allowedActions(order, app.account, now)
  const disabled = app.busy || app.loading || app.wrongNetwork || !app.account
  const steps = ['Tạo đơn', 'Nạp ký quỹ', 'Giao hàng', 'Hoàn tất']
  const index = ['created', 'funded', 'shipped', 'completed'].indexOf(order.status)
  return <>
    <a href="#/orders" className="back-link"><ChevronLeft size={16} />Danh sách đơn hàng</a>
    <div className="page-heading"><div><div className="eyebrow">ĐƠN #{order.id.padStart(3, '0')}</div><h1>{order.title}</h1><p>Tạo lúc {date(order.createdAt)}</p></div><Badge status={order.status} /></div>
    <div className="content-grid"><section className="panel detail-panel"><h2>Tiến trình giao dịch</h2>
      {order.status === 'refunded' ? <div className="refund-message"><CheckCircle2 size={22} />ETH ký quỹ đã được hoàn lại cho người mua.</div> : <ol className="steps">{steps.map((step, i) => <li key={step} className={i <= index ? 'done' : ''}><span>{i < index ? <Check size={16} /> : i + 1}</span><strong>{step}</strong></li>)}</ol>}
      <h3>Thông tin giao nhận</h3><p className="description">{order.description || 'Không có mô tả.'}</p><dl className="detail-list"><div><dt>Người bán</dt><dd><Address value={order.seller} /></dd></div><div><dt>Người mua</dt><dd><Address value={order.buyer} /></dd></div><div><dt>Hạn giao hàng</dt><dd>{date(order.deadline)}</dd></div><div><dt>Trạng thái thời hạn</dt><dd>{now >= order.deadline ? 'Đã đến hạn' : `Còn khoảng ${Math.max(1, Math.ceil((order.deadline - now) / 3600000))} giờ`}</dd></div></dl>
      {order.status === 'created' && now >= order.deadline && <div className="inline-note">Đơn đã hết hạn nạp ký quỹ. Người bán cần tạo đơn mới nếu hai bên tiếp tục giao dịch.</div>}
      {order.status === 'shipped' && <div className="inline-note">Chờ người mua xác nhận nhận hàng để giải ngân. Chính sách khi người mua không phản hồi chưa được thống nhất; phiên bản này không tự động giải ngân hoặc hoàn tiền sau khi đã giao.</div>}
      <p className="muted text-sm mt-5">Địa chỉ được rút gọn để dễ đọc. Di chuột để xem đầy đủ hoặc bấm để sao chép.</p>
    </section><aside className="panel action-panel"><span className="eyebrow">GIÁ TRỊ ĐƠN HÀNG</span><div className="large-amount">{eth(order.amount)} <span>ETH</span></div><p>{order.status === 'funded' || order.status === 'shipped' ? 'ETH đang được giữ trong ký quỹ.' : order.status === 'completed' ? 'Đã giải ngân cho người bán.' : order.status === 'refunded' ? 'Đã trả lại cho người mua.' : 'Chưa nạp ETH vào ký quỹ.'}</p><hr /><h3>Thao tác của bạn</h3><p className="muted">{sameAddress(order.buyer, app.account) ? 'Bạn là người mua của đơn hàng này.' : sameAddress(order.seller, app.account) ? 'Bạn là người bán của đơn hàng này.' : 'Ví hiện tại chỉ có quyền xem đơn hàng.'}</p>
      <div className="actions">{available.map(action => <button key={action} className={`button ${action === 'refund' ? 'danger' : 'primary'}`} disabled={disabled} onClick={() => setConfirmation(action)}>{ACTION[action]}<ArrowRight size={15} /></button>)}</div>
      {!available.length && <p className="inline-note">Không có thao tác phù hợp với ví, trạng thái và thời hạn hiện tại.</p>}
      {confirmation && available.includes(confirmation) && <div className="review"><h3>Xác nhận thao tác</h3><p>{confirmation === 'fund' ? `Nạp chính xác ${order.amount} ETH vào contract ký quỹ.` : confirmation === 'ship' ? 'Xác nhận bạn đã giao hàng. Sau bước này người mua không thể dùng luồng hoàn tiền quá hạn hiện tại.' : confirmation === 'complete' ? `Xác nhận đã nhận hàng. ${order.amount} ETH sẽ chuyển cho người bán.` : `${order.amount} ETH sẽ được hoàn lại ví người mua.`}</p><p className="muted">{app.mode === 'demo' ? 'Đây là mô phỏng, không sử dụng ETH thật.' : 'MetaMask sẽ hiển thị yêu cầu ký và phí gas.'}</p><div className="flex gap-2"><button className="button primary" disabled={disabled} onClick={async () => { if (await app.act(confirmation, order, ACTION[confirmation])) setConfirmation(null) }}>{app.busy && <LoaderCircle size={14} className="spin" />}Xác nhận</button><button className="button" disabled={app.busy} onClick={() => setConfirmation(null)}>Hủy</button></div></div>}
    </aside></div>
  </>
}
function Guide({ app }: { app: Escrow }) {
  const [reset, setReset] = useState(false)
  return <><div className="page-heading"><div><div className="eyebrow">BẮT ĐẦU TỪ ĐÂY</div><h1>Hướng dẫn & kết nối</h1><p>Thử luồng nghiệp vụ trước, kết nối contract khi sẵn sàng.</p></div></div><div className="guide-grid">
    <section className="panel guide-card"><FlaskConical size={24} /><h2>01. Chạy bản demo</h2><p>Chọn chế độ Demo và đổi vai trò trong thanh đầu trang.</p><ol><li>Vào Người bán → Tạo đơn hàng, dùng ví người mua mẫu và hạn ở tương lai.</li><li>Đổi sang Người mua → mở đơn → Nạp ETH ký quỹ.</li><li>Đổi Người bán → Đánh dấu đã giao.</li><li>Đổi Người mua → Xác nhận đã nhận hàng.</li><li>Mở đơn mẫu #005 để thử hoàn tiền quá hạn.</li></ol><p>Số dư demo có cập nhật. Dữ liệu lưu trong trình duyệt, không có phí gas.</p><button className="button" disabled={app.busy || app.mode !== 'demo'} onClick={() => setReset(true)}>Khôi phục dữ liệu mẫu</button>{reset && <div className="review"><p>Xóa các thay đổi demo và nạp lại 5 đơn mẫu?</p><div className="flex gap-2"><button className="button danger" disabled={app.busy} onClick={() => { resetDemo(); void app.refresh(); setReset(false) }}>Xác nhận khôi phục</button><button className="button" onClick={() => setReset(false)}>Hủy</button></div></div>}</section>
    <section className="panel guide-card"><Wallet size={24} /><h2>02. Kết nối MetaMask</h2><ol><li>Chạy Hardhat local network do Hùng chuẩn bị.</li><li>Cài MetaMask, thêm mạng local và tài khoản thử nghiệm do Hardhat cung cấp.</li><li>Cấu hình địa chỉ contract trong file .env rồi khởi động lại frontend.</li><li>Chọn MetaMask, kết nối ví và chuyển đúng mạng.</li><li>Dùng hai ví riêng cho người bán và người mua.</li></ol><a href="https://metamask.io/" target="_blank" rel="noreferrer" className="text-link">Trang MetaMask<ExternalLink size={14} /></a><p className="muted">Ứng dụng không yêu cầu seed phrase hoặc private key. Tài khoản thử nghiệm chỉ dùng cho mạng local.</p></section>
    <section className="panel guide-card"><BookOpen size={24} /><h2>03. Khi Hùng có contract</h2><p>Cập nhật ABI, địa chỉ và adapter theo tài liệu <code>docs/CONTRACT_HANDOFF.md</code>. ABI hiện tại là giao diện đề xuất, chưa xác nhận tương thích với contract của Hùng.</p><dl className="detail-list"><div><dt>Chain ID</dt><dd>{config.chainId}</dd></div><div><dt>Contract</dt><dd className="break-all">{config.address || 'Chưa cấu hình'}</dd></div></dl><p>Không cần backend riêng: React gọi contract qua ethers.js và MetaMask.</p></section>
    <section className="panel guide-card"><Clock3 size={24} /><h2>04. Quy tắc phiên bản đầu</h2><p>Người mua hoàn tiền được khi đã nạp ký quỹ, đã đến hạn, người bán chưa đánh dấu giao hàng.</p><p>Đơn đã giao sẽ chờ người mua xác nhận. Nhóm cần thống nhất chính sách không phản hồi trước khi chốt contract.</p><p>Ẩn nút ở frontend chỉ giúp tránh nhầm thao tác. Contract phải tự kiểm tra quyền, thời hạn và chống rút tiền lặp.</p></section>
  </div></>
}
export default function App() {
  const app = useEscrow()
  const path = usePath()
  useEffect(() => { window.scrollTo(0, 0) }, [path])
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const detail = /^\/orders\/(\d+)$/.exec(path)
  const section = path === '/guide' ? 'Hướng dẫn' : path === '/create' ? 'Tạo đơn hàng' : 'Đơn hàng'
  return <div className="app-shell"><a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus() }}>Đến nội dung chính</a>
    <aside className="sidebar"><a href="#/orders" className="brand"><span><ShieldCheck size={24} /></span>TrustOrder<span className="brand-dot">.</span></a><div className="sidebar-label">QUẢN LÝ KÝ QUỸ</div><nav aria-label="Điều hướng chính"><a href="#/orders" className={path.startsWith('/orders') ? 'active' : ''}><LayoutDashboard size={19} />Đơn hàng<ChevronRight size={15} className="nav-arrow" /></a><a href="#/create" className={path === '/create' ? 'active' : ''}><Plus size={19} />Tạo đơn hàng</a><a href="#/guide" className={path === '/guide' ? 'active' : ''}><BookOpen size={19} />Hướng dẫn</a></nav><div className="sidebar-card"><ShieldCheck size={25} /><h3>Ký quỹ minh bạch</h3><p>Theo dõi trạng thái và quyền thao tác của từng bên.</p><a href="#/guide">Khám phá cách hoạt động<ArrowRight size={14} /></a></div><div className="sidebar-footer"><span className="avatar">H</span><div><strong>BTL Blockchain</strong><small>Frontend · Huy</small></div><span className="version">v1.0</span></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={13} /><strong>{section}</strong></div><div className="wallet-tools"><div className="mode-switch" aria-label="Chế độ dữ liệu"><button disabled={app.busy || app.connecting} className={app.mode === 'demo' ? 'selected' : ''} onClick={() => app.changeMode('demo')}>Demo</button><button disabled={app.busy || app.connecting} className={app.mode === 'live' ? 'selected' : ''} onClick={() => app.changeMode('live')}>MetaMask</button></div>{app.mode === 'demo' ? <select className="demo-role" aria-label="Ví demo" value={app.account} disabled={app.busy} onChange={e => app.setAccount(e.target.value)}><option value={DEMO_BUYER}>Người mua mẫu</option><option value={DEMO_SELLER}>Người bán mẫu</option><option value={DEMO_OBSERVER}>Người xem mẫu</option></select> : <span className={`network ${app.wrongNetwork ? 'wrong' : ''}`}><span className="live-dot" />{app.wallet ? `Chain ${app.wallet.chainId}` : 'Chưa kết nối'}</span>}{app.account ? <div className="wallet-chip"><Wallet size={16} /><div><strong>{shortAddress(app.account)}</strong><span>{eth(app.balance)} ETH{app.mode === 'demo' ? ' mẫu' : ''}</span></div></div> : <button className="button primary small" disabled={app.connecting} onClick={() => void app.connect()}><Wallet size={16} />{app.connecting ? 'Đang kết nối…' : 'Kết nối ví'}</button>}</div></header>
    <main id="main" tabIndex={-1}><div className={`mode-banner ${app.mode}`}><span>{app.mode === 'demo' ? <FlaskConical size={16} /> : <ShieldCheck size={16} />}<strong>{app.mode === 'demo' ? 'Chế độ demo' : 'Chế độ blockchain'}</strong>{app.mode === 'demo' ? 'Dữ liệu mô phỏng · Không gửi giao dịch blockchain.' : 'Giao dịch được ký trong MetaMask và xác nhận trên mạng đang chọn.'}</span><a href="#/guide">Hướng dẫn<ArrowRight size={13} /></a></div>
      {app.wrongNetwork && <div className="error-banner" role="alert"><span>Ví đang ở sai mạng. Cần chain ID {config.chainId}.</span><button className="button small" disabled={app.connecting || app.busy} onClick={() => void app.changeNetwork()}>Chuyển mạng</button></div>}
      {app.error && <div className="error-banner" role="alert"><span>{app.error}</span>{app.mode === 'live' && !app.account && <button className="button small" disabled={app.connecting} onClick={() => void app.connect()}>Kết nối lại</button>}</div>}
      <TransactionNotice app={app} />
      {path === '/create' ? <CreateOrder key={app.mode + app.account} app={app} /> : path === '/guide' ? <Guide app={app} /> : detail ? <Detail app={app} id={detail[1]} now={now} /> : path === '/orders' ? <OrderList app={app} /> : <div className="panel empty"><h1>Không tìm thấy trang</h1><a className="button" href="#/orders">Về danh sách</a></div>}
      <footer className="main-footer"><span>TrustOrder · Bài tập lớn Blockchain</span><span>Ethereum / React / TypeScript</span></footer>
    </main></div>
  </div>
}
