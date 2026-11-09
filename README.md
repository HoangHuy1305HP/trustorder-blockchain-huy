# TrustOrder — Phần frontend của Huy

Ứng dụng ký quỹ đơn hàng bằng React + TypeScript + Vite + Tailwind CSS + ethers.js. Không cần backend riêng.

## Chạy ngay

Yêu cầu Node.js 22.12+ hoặc 24 LTS, npm và trình duyệt hiện đại.

```powershell
cd C:\Users\ASUS\Documents\ChatGPT\DUONG_PROJECT\huy-frontend
npm install
npm run dev
```

Mở URL Local mà Vite in trong terminal (thường `http://127.0.0.1:5173`). Mặc định là **Demo**, không cần MetaMask, contract hoặc ETH. Giữ terminal chạy trong lúc sử dụng; Ctrl+C để dừng.

```powershell
npm test
npm run build
npm run preview
```

`build` kiểm tra TypeScript và tạo bản production trong `dist/`. `preview` phục vụ bản build để kiểm tra cục bộ. Không mở `dist/index.html` bằng file://. Trong bản giao này chưa xuất bản website, vì ứng dụng hướng đến Hardhat local của nhóm.

## Đã triển khai phần của Huy

- Khởi tạo project React/TypeScript, Tailwind, ethers v6; cấu hình build và kiểm thử.
- Danh sách đơn, tìm kiếm, lọc trạng thái/vai trò và thống kê ký quỹ.
- Tạo đơn, kiểm tra ví người mua, số ETH, thời hạn; bước xác nhận trước khi gửi.
- Chi tiết đơn, tiến trình và thao tác theo vai trò: nạp, đánh dấu giao, xác nhận nhận, hoàn tiền khi đủ điều kiện.
- Demo gồm 5 đơn mẫu và 3 vai trò, lưu localStorage, mô phỏng thay đổi số dư ETH.
- MetaMask: kết nối, địa chỉ, số dư, sự kiện đổi tài khoản/mạng/ngắt kết nối, chuyển mạng Hardhat.
- Giao dịch: chờ ký, chờ xác nhận, thành công, thất bại; hash, lỗi từ chối ký, gas không đủ, contract revert.
- Làm mới thủ công và đồng bộ dữ liệu live mỗi 15 giây; giao diện thích ứng máy tính/điện thoại.
- Hướng dẫn người dùng trong ứng dụng và tài liệu báo cáo, demo, tích hợp đi kèm.

## Tích hợp contract sau này

ABI hiện tại là **đề xuất**, không phải ABI đã nhận từ Hùng. Chế độ blockchain là adapter đã viết theo đề xuất này; chưa có contract triển khai để xác nhận tương thích đầu cuối.

1. Nhận ABI sau compile, địa chỉ deploy, chain ID và quy tắc nghiệp vụ từ Hùng.
2. Đọc [hướng dẫn bàn giao](docs/CONTRACT_HANDOFF.md), cập nhật `src/contracts/escrowAbi.ts` và `src/services/live.ts` nếu khác tên hàm, tuple, enum hoặc cách đánh số ID.
3. Sao chép `.env.example` thành `.env`, điền `VITE_CONTRACT_ADDRESS`; mặc định chain 31337.
4. Khởi động lại Vite. Trong trình duyệt thông thường có cài MetaMask, chọn chế độ MetaMask và kết nối.
5. Thử giữa hai tài khoản local, chạy toàn bộ [kịch bản demo](docs/DEMO_AND_TESTING.md).

Chỉ đặt `VITE_APP_MODE=live` nếu muốn mặc định mở chế độ thật. Các biến `VITE_` được đóng gói vào frontend và là công khai. Không điền private key hoặc seed phrase vào project. Ví local và ETH thử nghiệm chỉ dùng với Hardhat.

## Cấu trúc

```text
src/
  App.tsx                    Màn hình, điều hướng hash, form và xác nhận
  useEscrow.ts               Trạng thái ứng dụng, tải dữ liệu, vòng đời transaction
  domain.ts                  Model, validation và điều kiện thao tác
  config.ts                  Cấu hình mạng/contract
  contracts/escrowAbi.ts      ABI đề xuất
  services/
    types.ts                 Giao diện chung cho demo/live
    demo.ts                  Kho demo và mô phỏng giao dịch
    wallet.ts                MetaMask/EIP-1193, phát hiện EIP-6963
    live.ts                  Adapter ethers, chuyển đổi dữ liệu contract
  styles.css                 Tailwind + giao diện responsive
docs/
  CONTRACT_HANDOFF.md         Đề xuất kỹ thuật để làm việc với Hùng
  DEMO_AND_TESTING.md         Kịch bản demo và kiểm thử thủ công
  BAO_CAO_HUY.md              Bản thảo báo cáo phần frontend
  HOC_VA_TRIEN_KHAI.md        Lộ trình đọc và phát triển project
```

## Phạm vi và điều cần chốt

Demo và blockchain dùng hai nguồn dữ liệu riêng, không chuyển dữ liệu demo lên chain. Demo không mô phỏng phí gas, chữ ký hay bảo mật của blockchain; quyền trong demo chỉ phục vụ minh họa.

Chính sách mẫu: hoàn tiền khi đã ký quỹ, đã đến hạn, chưa đánh dấu giao. Đã đánh dấu giao thì chờ người mua xác nhận. Xử lý người mua không phản hồi sau giao hàng **chưa được quyết định**; phải thống nhất với Hùng trước khi chốt contract. Frontend không tự thêm trọng tài hoặc tự động chuyển tiền.

Contract phải tự bảo vệ quyền, thời hạn và chuyển tiền một lần. UI không thể thay thế kiểm tra của contract. Adapter hiện tải tối đa 1.000 đơn bằng các lô 20; cần phân trang/indexer nếu mở rộng.

Tài liệu tham khảo chính thức: [Vite](https://vite.dev/guide/), [React](https://react.dev/learn), [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite), [ethers v6](https://docs.ethers.org/v6/getting-started/), [MetaMask provider](https://docs.metamask.io/metamask-connect/evm/reference/provider-api/).
