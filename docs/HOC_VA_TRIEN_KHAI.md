# Học và phát triển phần của Huy

## 1. Khởi động project

Đọc README, chạy `npm install`, `npm run dev`, thử các màn hình bằng Demo. Mở `src/main.tsx` để thấy React gắn vào root, sau đó đọc `App.tsx` để thấy các màn hình. Điều hướng dùng URL hash nên chạy được bằng static hosting mà không cần cấu hình rewrite server.

Vite là công cụ phát triển/build, TypeScript kiểm tra kiểu dữ liệu, React quản lý component và state, Tailwind xử lý utility CSS. `styles.css` bổ sung bộ style riêng cho dashboard.

## 2. Hiểu Ethereum và MetaMask vừa đủ để làm frontend

- Ví có địa chỉ công khai, dùng để phân biệt buyer/seller. Private key nằm trong ví.
- Đọc state không yêu cầu transaction hay gas; ghi state phải ký transaction và trả gas.
- ETH chia thành wei: 1 ETH = 10^18 wei. Dùng ethers `parseEther` và `formatEther`; không dùng Number để tính số wei.
- Mạng local có chain ID và RPC riêng; cùng địa chỉ có thể không tồn tại contract trên mạng khác.
- ABI mô tả tên hàm, kiểu tham số, kết quả và event. Địa chỉ cho biết contract instance cụ thể. Cần cả ABI đúng và địa chỉ đúng trên mạng đúng.

Đọc `wallet.ts` cho provider/kết nối ví, `live.ts` cho signer/gọi hàm/wait receipt. Không cần học DeFi/NFT để hoàn thành đề tài này.

## 3. Hiểu cấu trúc dữ liệu và luồng UI

Đọc `domain.ts` trước: `Order`, `NewOrder`, `Status`, `Action`. `allowedActions` tính nút có thể hiển thị; `validateOrder` kiểm tra form. Đọc `services/types.ts` và so sánh demo/live để thấy cùng một giao diện nhưng hai nguồn dữ liệu.

`useEscrow.ts` giữ mode, account, dữ liệu và trạng thái transaction; ngăn gửi lặp, làm mới theo ngữ cảnh và bỏ kết quả request đã cũ. `App.tsx` dùng hook và model để hiển thị, không gọi contract rải rác ở từng nút.

## 4. Tiến độ theo ba tuần trong kế hoạch

| Giai đoạn | Phần code/tài liệu sẵn có | Việc bạn cần thực hành |
| --- | --- | --- |
| Tuần 1 | Project, kết nối MetaMask, ví/số dư, model/ABI đề xuất | Tự chạy demo; giải thích provider vs signer; gửi Hùng CONTRACT_HANDOFF.md để thống nhất |
| Tuần 2 | Danh sách/tạo/chi tiết, adapter ethers, vai trò/nút | Nhận ABI và địa chỉ; cập nhật adapter; thử giao dịch giữa hai ví local |
| Tuần 3 | Trạng thái pending/success/failed, lỗi, dữ liệu mẫu, bản thảo báo cáo | Chạy toàn bộ checklist với contract thực tế; chụp ảnh, ghi kết quả, tập demo |

## 5. Build và bàn giao

`npm test` kiểm tra hành vi quan trọng. `npm run build` tạo `dist/`. `npm run preview` kiểm tra bản production. Khi biến VITE thay đổi, khởi động lại dev server hoặc build lại. Đưa source và package-lock vào Git; không đưa node_modules, .env, dist, private key.

Khi Hùng thay đổi contract, kiểm tra lại ABI, enum, ID, thời gian, event/error và các quyền. Sửa adapter/domain rồi chạy lại test và demo hai ví. Không đổi chính sách hoàn tiền ở frontend mà không thống nhất contract.
