# TrustOrderEscrow

Từ thư mục `blockchain`, cài dependency rồi chạy kiểm thử:

```sh
npm ci
npx hardhat test
```

## Chạy Hardhat local

Mở terminal thứ nhất trong thư mục `blockchain` và giữ node chạy:

```sh
npx hardhat node
```

Mở terminal thứ hai trong cùng thư mục và deploy:

```sh
npx hardhat ignition deploy ignition/modules/TrustOrder.ts --network localhost --deployment-id trustorder-local
```

Lấy địa chỉ `TrustOrderModule#TrustOrderEscrow` ở mục **Deployed Addresses** hoặc trong `ignition/deployments/trustorder-local/deployed_addresses.json`. Nếu khởi động mới node và muốn deploy trên chain trống, dùng một deployment ID mới để Ignition không dùng lại trạng thái lưu từ phiên trước.

Sao chép `.env.example` thành `.env` ở thư mục frontend. Đặt `VITE_CONTRACT_ADDRESS` bằng địa chỉ vừa deploy, `VITE_CHAIN_ID=31337` và `VITE_RPC_URL=http://127.0.0.1:8545`. Khởi động lại frontend và dùng hai tài khoản Hardhat thử nghiệm trên MetaMask. ABI nằm trong trường `abi` của `artifacts/contracts/TrustOrderEscrow.sol/TrustOrderEscrow.json`.

## Giải ngân khi người mua không phản hồi

Khi người bán đánh dấu đã giao, contract ghi mốc `sellerClaimAt(id)` bằng thời gian block cộng 48 giờ. Từ mốc đó, người bán có thể gọi `claimAfterTimeout(id)` để nhận ETH. Người mua vẫn có thể xác nhận trước khi giao dịch giải ngân được ghi nhận. Cả hai thao tác chuyển cùng một đơn sang `Completed`, nên chỉ giao dịch hợp lệ đầu tiên chuyển tiền.

Quy tắc demo dùng thao tác đánh dấu đã giao của người bán để bắt đầu tính giờ. Nếu người bán chưa đánh dấu đã giao, người mua vẫn có quyền yêu cầu hoàn tiền sau hạn giao.
