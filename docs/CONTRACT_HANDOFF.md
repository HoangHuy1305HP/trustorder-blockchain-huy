# Giao diện bàn giao Huy ↔ Hùng

Frontend dùng ABI từ artifact của TrustOrderEscrow. Cập nhật ABI từ artifact mỗi khi contract đổi.

## Thông tin cần nhận

- ABI JSON từ artifact compile (phần `abi`, không phải toàn bộ artifact).
- Địa chỉ contract deploy, chain ID, RPC URL; địa chỉ sẽ thay đổi khi redeploy hoặc reset mạng.
- Tên hàm, tham số, trường struct trả về và thứ tự, mã enum, ID bắt đầu từ 0 hay 1.
- Event tạo đơn/thay đổi trạng thái và custom error nếu có.
- Hạn tính theo giây Unix và thời gian block; cách giải quyết trường hợp đã giao nhưng người mua không xác nhận.
- Hai tài khoản local được cấp ETH, kịch bản tạo dữ liệu, lệnh chạy node và deploy trong repository contract của Hùng.

## Model dữ liệu

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

## Hàm contract

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

## Giải ngân sau 48 giờ

Contract ghi `sellerClaimAt(id)` khi người bán đánh dấu đã giao. Frontend đổi mốc Unix seconds này sang milliseconds. Người bán gọi `claimAfterTimeout(id)` khi thời gian block đã đến mốc và đơn còn ở `Shipped`. Người mua vẫn có thể gọi `confirmReceived(id)` khi đơn còn ở trạng thái này. Giao dịch hợp lệ đầu tiên hoàn tất đơn và giải ngân.

Chế độ MetaMask lấy timestamp từ block mới nhất khi làm mới và đọc lại trước khi gửi giao dịch. Chế độ Demo dùng giờ máy. Contract quyết định theo thời gian và trạng thái tại block thực thi.
