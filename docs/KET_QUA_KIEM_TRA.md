# Kết quả kiểm tra bản bàn giao

Ngày 09/11/2026 (Asia/Bangkok), Node.js 24.14.1, npm 11.11.0.

## Đã kiểm tra

- `npm test`: 4 file, 38 test đạt. Bao gồm kiểm soát vai trò, biên thời hạn, form, số ETH chính xác đến 1 wei, ngăn xử lý lặp, bảo toàn số dư demo, ánh xạ adapter, gửi đúng value, receipt/replacement/cancel, sai mạng/bytecode và luồng UI giữa hai vai trò.
- `npm run build`: TypeScript và Vite production build thành công; output trong `dist/`. Tách bundle ethers riêng; không còn cảnh báo chunk > 500 kB.
- Kiểm tra phụ thuộc sau cập nhật Vitest: npm báo 0 vulnerabilities tại thời điểm cài đặt. Đây là kết quả của cơ sở dữ liệu npm tại thời điểm kiểm tra, không phải cam kết an toàn tuyệt đối.
- Máy chủ dev trả HTTP 200. Mở bằng Chrome, kiểm tra danh sách, chi tiết, bước xác nhận hoàn tiền, trạng thái mô phỏng thành công và số dư buyer tăng 0.04 ETH.
- Kiểm tra form tạo đơn trên desktop và khung iPhone SE 375 × 667; bố cục chuyển thành một cột, thanh điều hướng/ví thích ứng. Bảng đơn được thiết kế cuộn ngang khi hẹp.
- Các máy chủ kiểm thử đã được dừng sau QA. Chạy `npm run dev` để mở lại; URL và cổng theo thông tin Vite in ra.

## Chưa xác minh được

- Giao dịch thật giữa MetaMask và contract của Hùng, vì chưa có ABI/địa chỉ/contract bàn giao.
- Độ an toàn và các unit test của smart contract; thuộc phần contract của Hùng.
- Chính sách xử lý Shipped nhưng buyer không xác nhận: cần nhóm quyết định trước khi chốt luồng và kiểm thử.

Các test live sử dụng mock provider/contract để kiểm tra adapter frontend. Không coi các test đó là bằng chứng contract đã được triển khai hoặc đã tương thích thực tế.
