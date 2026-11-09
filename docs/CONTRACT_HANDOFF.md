# Giao diện bàn giao Huy ↔ Hùng

Đây là **đề xuất để thống nhất**, chưa mô tả contract đã tồn tại. Nếu Hùng đã viết contract khác, giữ contract làm nguồn xác thực và sửa adapter thay vì sửa toàn bộ giao diện.

## Thông tin cần nhận

- ABI JSON từ artifact compile (phần `abi`, không phải toàn bộ artifact).
- Địa chỉ contract deploy, chain ID, RPC URL; địa chỉ sẽ thay đổi khi redeploy hoặc reset mạng.
- Tên hàm, tham số, trường struct trả về và thứ tự, mã enum, ID bắt đầu từ 0 hay 1.
- Event tạo đơn/thay đổi trạng thái và custom error nếu có.
- Hạn tính theo giây Unix và thời gian block; cách giải quyết trường hợp đã giao nhưng người mua không xác nhận.
- Hai tài khoản local được cấp ETH, kịch bản tạo dữ liệu, lệnh chạy node và deploy trong repository contract của Hùng.

## Model đề xuất

```solidity
enum Status { Created, Funded, Shipped, Completed, Refunded }
struct Order {
    uint256 id;
    string title;
    string description;
    address seller;
    address buyer;
    uint256 amount;      // wei
    uint256 createdAt;   // Unix seconds
    uint256 deadline;    // Unix seconds
    Status status;
}
```

Frontend dùng `amount` dạng chuỗi ETH, số tiền được chuyển bằng `parseEther/formatEther`, không dùng phép nhân Number cho chuyển tiền. Thời gian frontend là milliseconds; adapter đổi sang seconds khi gửi và ngược lại khi đọc.

## Hàm đề xuất

| Hàm | Quyền và ý nghĩa |
| --- | --- |
| `orderCount() view returns (uint256)` | Tổng đơn; ID liên tục 1..count, không xóa ID |
| `getOrder(uint256 id) view returns (Order)` | Thông tin một đơn; ID không tồn tại phải báo lỗi |
| `createOrder(string title, string description, address buyer, uint256 amount, uint256 deadline)` | Sender là seller; buyer hợp lệ, khác seller, amount > 0, deadline ở tương lai; không payable |
| `fundOrder(uint256 id) payable` | Đúng buyer, Created, trước hạn, msg.value bằng amount |
| `markShipped(uint256 id)` | Đúng seller, Funded và trước hạn |
| `confirmReceived(uint256 id)` | Đúng buyer, Shipped; chuyển amount cho seller đúng một lần |
| `refundOrder(uint256 id)` | Đúng buyer, Funded và block.timestamp >= deadline; chuyển amount về buyer một lần |

Tên hiển thị “đánh dấu đã giao” có nghĩa seller thông báo gửi/giao hàng. Buyer xác nhận thực nhận ở bước cuối. Nhóm cần thống nhất cách dùng từ và kiểm thử tương ứng.

Event đề xuất để mở rộng: `OrderCreated`, `OrderFunded`, `OrderShipped`, `OrderCompleted`, `OrderRefunded`, có indexed orderId/buyer/seller phù hợp. Bản đầu frontend tải lại state sau receipt, chưa phụ thuộc event.

## Thay đổi cần làm khi nhận contract

1. `src/contracts/escrowAbi.ts`: thay mảng ABI bằng ABI thực tế, giữ export `escrowAbi`. Nếu import JSON cần export phần `.abi` đúng cấu trúc artifact.
2. `src/services/live.ts`: sửa `mapOrder` cho tên/kiểu/thứ tự trường và bảng `states`; sửa tên hàm gọi trong `create`, `act`, `list`.
3. Nếu getOrder trả tuple không đặt tên, ánh xạ bằng index theo ABI. Nếu ID từ 0, sửa vòng lặp `list`.
4. `src/domain.ts`: sửa `allowedActions` nếu contract có quy tắc khác. Chỉ bổ sung trạng thái mới sau khi Hùng xác nhận luồng nghiệp vụ.
5. `.env`: sửa địa chỉ, chain ID và RPC. Khởi động lại Vite/build lại sau thay đổi.
6. Xác minh bytecode tại địa chỉ (adapter đã kiểm tra `getCode`), đọc đơn thử, tạo đơn, giao dịch giữa hai ví và kiểm thử lỗi.

Mẫu `.env`:

```dotenv
VITE_APP_MODE=demo
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CONTRACT_ADDRESS=0x_DIEN_DIA_CHI_DEPLOY_THUC_TE
```

## Quy tắc bắt buộc phải chốt

Khi đã Shipped mà buyer không xác nhận, tiền có thể bị giữ vô thời hạn theo luồng hiện tại. **Chưa chốt chính sách giải quyết.** Nhóm cần chọn giải pháp, xác định ai được thao tác và khi nào, rồi cập nhật contract, UI, báo cáo và test cùng nhau. Bản này chỉ thông báo chờ xác nhận; không tự giải ngân sau hạn, không cho refund đơn Shipped.

Thời gian UI dựa đồng hồ máy và cập nhật mỗi giây. Contract dùng `block.timestamp` làm nguồn quyết định; thời điểm sát hạn có thể bị revert. Receipt thành công mới được coi là xác nhận giao dịch. Các kiểm tra UI chỉ giúp người dùng, không phải cơ chế bảo mật.
