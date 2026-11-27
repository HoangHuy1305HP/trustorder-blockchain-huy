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

## Kết nối MetaMask với Hardhat local

Chạy node và deploy contract theo [hướng dẫn blockchain](blockchain/README.md). Sao chép `.env.example` thành `.env`, điền địa chỉ vừa deploy vào `VITE_CONTRACT_ADDRESS`, rồi khởi động lại Vite. Chọn MetaMask và kết nối mạng Hardhat local (chain ID 31337).

ABI frontend lấy từ artifact compile của TrustOrderEscrow. Frontend đọc thời gian block và mốc `sellerClaimAt` để hiển thị quyền giải ngân. Hãy deploy bản contract trên nhánh này để sử dụng tính năng.

Chỉ đặt `VITE_APP_MODE=live` nếu muốn mặc định mở chế độ thật. Các biến `VITE_` được đóng gói vào frontend và là công khai. Không điền private key hoặc seed phrase vào project. Ví local và ETH thử nghiệm chỉ dùng với Hardhat.

## Cấu trúc

```text
src/
  App.tsx                    Màn hình, điều hướng hash, form và xác nhận
  useEscrow.ts               Trạng thái ứng dụng, tải dữ liệu, vòng đời transaction
  domain.ts                  Model, validation và điều kiện thao tác
  config.ts                  Cấu hình mạng/contract
  contracts/escrowAbi.ts      ABI TrustOrderEscrow
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

Người mua có thể yêu cầu hoàn tiền sau hạn nếu đơn đã ký quỹ và chưa được đánh dấu đã giao. Sau khi đánh dấu đã giao, người mua có thể xác nhận nhận hàng. Nếu sau 48 giờ đơn vẫn đang chờ xác nhận, người bán có thể yêu cầu giải ngân. Cả hai thao tác hoàn tất đều chuyển ETH cho người bán đúng một lần.

Contract phải tự bảo vệ quyền, thời hạn và chuyển tiền một lần. UI không thể thay thế kiểm tra của contract. Adapter hiện tải tối đa 1.000 đơn bằng các lô 20; cần phân trang/indexer nếu mở rộng.

Tài liệu tham khảo chính thức: [Vite](https://vite.dev/guide/), [React](https://react.dev/learn), [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite), [ethers v6](https://docs.ethers.org/v6/getting-started/), [MetaMask provider](https://docs.metamask.io/metamask-connect/evm/reference/provider-api/).
