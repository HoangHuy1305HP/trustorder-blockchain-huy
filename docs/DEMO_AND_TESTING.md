# Demo và kiểm thử

## Demo không cần contract

`npm run dev` → mở URL Local. Chế độ Demo lưu dữ liệu riêng trong localStorage của trình duyệt.

| Vai trò | Địa chỉ mẫu |
| --- | --- |
| Người bán | `0x1111111111111111111111111111111111111111` |
| Người mua | `0x2222222222222222222222222222222222222222` |
| Người xem | `0x3333333333333333333333333333333333333333` |

Đây là danh tính mô phỏng, không phải tài khoản Hardhat có private key; không import hoặc gửi ETH vào các địa chỉ mẫu.

### Kịch bản 1: Hoàn tất

1. Đổi vai trò Người bán. Tạo đơn: tên “Sách Blockchain”, buyer mẫu, 0.01 ETH, hạn ngày mai.
2. Kiểm tra thông tin → Xác nhận tạo đơn. Đơn xuất hiện Chờ ký quỹ.
3. Đổi Người mua, mở đơn, nạp ETH và xác nhận. Số dư buyer giảm 0.01; đơn Đã ký quỹ.
4. Đổi Người bán, đánh dấu đã giao và xác nhận. Đơn Đang giao hàng.
5. Đổi Người mua, xác nhận đã nhận hàng. Seller nhận 0.01, đơn Hoàn tất; không còn nút thanh toán.

### Kịch bản 2: Hoàn tiền

1. Chọn Người mua, mở đơn mẫu #005 đã quá hạn và chưa giao.
2. Yêu cầu hoàn tiền → Xác nhận. Buyer được cộng 0.04 ETH; trạng thái Đã hoàn tiền.
3. Không thể hoàn thêm lần nữa. Khôi phục dữ liệu mẫu trong Hướng dẫn để lặp demo.

### Kịch bản 3: Quyền và dữ liệu lỗi

- Người xem không thấy nút nạp/giao/xác nhận/hoàn tiền.
- Người bán không được nạp đơn của mình. Người mua không được đánh dấu đã giao.
- Tạo đơn với ví sai, zero address, cùng buyer/seller, ETH bằng 0/âm/quá 18 thập phân, hạn quá khứ: báo lỗi và không tạo đơn.
- Đơn Created đã hết hạn không được nạp; cần tạo lại đơn.
- Đơn Shipped không có nút refund. Hiển thị vấn đề người mua không phản hồi.
- Tìm mã/tên/ví; lọc vai trò/trạng thái; trường hợp không có kết quả; mở URL đơn không tồn tại.
- Kiểm tra ở màn hình khoảng 390px và 1440px; bảng cuộn ngang trên điện thoại.
- Khi chờ giao dịch, vô hiệu hóa gửi lặp/đổi chế độ/đổi vai trò; sau hoàn tất mới cho thao tác tiếp.

## Kiểm thử MetaMask sau khi có contract

Chỉ đánh dấu đạt sau khi chạy với contract thật của Hùng trên mạng local. ABI đề xuất hiện chưa thay thế bằng ABI bàn giao.

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Chưa cài MetaMask | Báo chưa tìm thấy ví; demo vẫn hoạt động |
| Từ chối kết nối/ký | Báo lỗi; không hiện thành công |
| Yêu cầu kết nối đang chờ | Nhắc mở MetaMask, không gửi yêu cầu lặp |
| Sai chain | Hiện nút chuyển mạng, chặn thao tác |
| Địa chỉ contract trống/sai | Báo cấu hình, không gửi giao dịch |
| Địa chỉ không có bytecode | Báo không có contract trên mạng đã chọn |
| Đổi ví/chain hoặc ngắt ví | Xóa dữ liệu cũ và tải lại theo ví/mạng |
| Buyer nạp đúng tiền | value = amount wei; status chỉ cập nhật sau receipt |
| Ví thiếu ETH/gas | Báo không đủ tiền; không hiện thành công |
| Contract revert | Hiển thị lỗi; không thay trạng thái cục bộ giả |
| Pending lâu | Hiện hash và trạng thái chờ, chưa cho gửi lặp |
| Giao dịch bị hủy/thay thế | Xử lý replacement; hủy không được xem thành công |
| Receipt thành công, tải lại lỗi | Giữ thông báo xác nhận, báo lỗi tải dữ liệu riêng |
| Redeploy hoặc reset local chain | Cập nhật địa chỉ/ABI, kiểm tra lại account nonce trong MetaMask nếu cần |

Sau kết nối, lặp toàn bộ hai luồng Hoàn tất và Hoàn tiền bằng hai ví Hardhat khác nhau. Chụp màn hình danh sách, tạo đơn, chi tiết và transaction receipt để thêm vào báo cáo thực nghiệm.

## Kiểm tra tự động

```powershell
npm test
npm run build
```

Tests kiểm tra quyền/trạng thái/thời hạn, bảo toàn số dư demo, ngăn thanh toán lặp, ánh xạ contract và luồng thao tác giao diện. Đây không phải test bảo mật smart contract. Hùng cần test contract độc lập bằng Hardhat.
