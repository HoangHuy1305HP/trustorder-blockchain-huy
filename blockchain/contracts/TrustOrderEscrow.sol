// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TrustOrderEscrow is ReentrancyGuard {
    enum Status {
        Created,
        Funded,
        Shipped,
        Completed,
        Refunded
    }

    struct Order {
        uint256 id;
        string title;
        string description;
        address seller;
        address buyer;
        uint256 amount;      // Wei
        uint256 createdAt;   // Unix timestamp, seconds
        uint256 deadline;    // Unix timestamp, seconds
        Status status;
    }

    uint256 public constant RECEIPT_WINDOW = 48 hours;
    uint256 public orderCount;
    mapping(uint256 => uint256) public sellerClaimAt;

    mapping(uint256 => Order) private orders;

    event OrderCreated(
        uint256 indexed id,
        address indexed seller,
        address indexed buyer,
        uint256 amount,
        uint256 deadline
    );

    event OrderFunded(
        uint256 indexed id,
        address indexed buyer,
        uint256 amount
    );

    event OrderShipped(
        uint256 indexed id,
        address indexed seller
    );

    event OrderCompleted(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );

    event OrderClaimedAfterTimeout(uint256 indexed id, address indexed seller, uint256 amount);

    event OrderRefunded(
        uint256 indexed id,
        address indexed buyer,
        uint256 amount
    );

    function createOrder(
        string calldata title,
        string calldata description,
        address buyer,
        uint256 amount,
        uint256 deadline
    ) external returns (uint256 id) {
        require(bytes(title).length > 0, "EMPTY_TITLE");
        require(bytes(title).length <= 400, "TITLE_TOO_LONG");
        require(bytes(description).length <= 4000, "DESCRIPTION_TOO_LONG");
        require(buyer != address(0), "INVALID_BUYER");
        require(buyer != msg.sender, "BUYER_IS_SELLER");
        require(amount > 0, "INVALID_AMOUNT");
        require(deadline > block.timestamp, "INVALID_DEADLINE");

        id = ++orderCount;

        orders[id] = Order({
            id: id,
            title: title,
            description: description,
            seller: msg.sender,
            buyer: buyer,
            amount: amount,
            createdAt: block.timestamp,
            deadline: deadline,
            status: Status.Created
        });

        emit OrderCreated(id, msg.sender, buyer, amount, deadline);
    }

    function getOrder(uint256 id)
        external
        view
        returns (Order memory)
    {
        require(id > 0 && id <= orderCount, "ORDER_NOT_FOUND");
        return orders[id];
    }

    function fundOrder(uint256 id) external payable {
        require(id > 0 && id <= orderCount, "ORDER_NOT_FOUND");

        Order storage order = orders[id];

        require(msg.sender == order.buyer, "ONLY_BUYER");
        require(order.status == Status.Created, "INVALID_STATUS");
        require(block.timestamp < order.deadline, "FUNDING_EXPIRED");
        require(msg.value == order.amount, "INCORRECT_VALUE");

        order.status = Status.Funded;

        emit OrderFunded(id, msg.sender, msg.value);
    }

    function markShipped(uint256 id) external {
        require(id > 0 && id <= orderCount, "ORDER_NOT_FOUND");

        Order storage order = orders[id];

        require(msg.sender == order.seller, "ONLY_SELLER");
        require(order.status == Status.Funded, "INVALID_STATUS");
        require(block.timestamp < order.deadline, "SHIPPING_DEADLINE_PASSED");

        order.status = Status.Shipped;
        sellerClaimAt[id] = block.timestamp + RECEIPT_WINDOW;

        emit OrderShipped(id, msg.sender);
    }

    function confirmReceived(uint256 id) external nonReentrant {
        require(id > 0 && id <= orderCount, "ORDER_NOT_FOUND");

        Order storage order = orders[id];

        require(msg.sender == order.buyer, "ONLY_BUYER");
        require(order.status == Status.Shipped, "INVALID_STATUS");

        _paySeller(order);
        emit OrderCompleted(id, order.buyer, order.seller, order.amount);
    }

    function claimAfterTimeout(uint256 id) external nonReentrant {
        require(id > 0 && id <= orderCount, "ORDER_NOT_FOUND");

        Order storage order = orders[id];
        require(msg.sender == order.seller, "ONLY_SELLER");
        require(order.status == Status.Shipped, "INVALID_STATUS");
        require(block.timestamp >= sellerClaimAt[id], "RECEIPT_WINDOW_OPEN");

        _paySeller(order);
        emit OrderClaimedAfterTimeout(id, order.seller, order.amount);
    }

    function _paySeller(Order storage order) private {
        order.status = Status.Completed;

        uint256 amount = order.amount;
        address payable seller = payable(order.seller);

        (bool success, ) = seller.call{value: amount}("");
        require(success, "ETH_TRANSFER_FAILED");
    }

    function refundOrder(uint256 id) external nonReentrant {
        require(id > 0 && id <= orderCount, "ORDER_NOT_FOUND");

        Order storage order = orders[id];

        require(msg.sender == order.buyer, "ONLY_BUYER");
        require(order.status == Status.Funded, "INVALID_STATUS");
        require(block.timestamp >= order.deadline, "REFUND_NOT_AVAILABLE");

        // Cập nhật trạng thái trước khi chuyển ETH.
        order.status = Status.Refunded;

        uint256 amount = order.amount;
        address payable buyer = payable(order.buyer);

        (bool success, ) = buyer.call{value: amount}("");
        require(success, "ETH_TRANSFER_FAILED");

        emit OrderRefunded(id, order.buyer, amount);
    }
}
