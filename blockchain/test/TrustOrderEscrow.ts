import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "ethers";
import { network } from "hardhat";

const { ethers, networkHelpers: { time } } = await network.create();

describe("TrustOrderEscrow", function () {
    let seller: any;
    let buyer: any;
    let outsider: any;
    let escrow: any;
    let hardhatEthers: any;

    const amount = parseEther("0.01");
    let deadline: number;

    beforeEach(async function () {
        hardhatEthers = ethers;
        [seller, buyer, outsider] = await hardhatEthers.getSigners();

        escrow = await hardhatEthers.deployContract("TrustOrderEscrow");
        await escrow.waitForDeployment();

        deadline = (await time.latest()) + 3600;

        await escrow.connect(seller).createOrder("Sach Blockchain", "Don hang kiem thu", buyer.address, amount, deadline);
    });

    it("seller creates an order with ID 1 and Created status", async function () {
        expect(await escrow.orderCount()).to.equal(1n);

        const order = await escrow.getOrder(1n);

        expect(order.id).to.equal(1n);
        expect(order.seller).to.equal(seller.address);
        expect(order.buyer).to.equal(buyer.address);
        expect(order.amount).to.equal(amount);
        expect(order.status).to.equal(0n);
    });

    it("rejects funding from an address other than buyer", async function () {
        await expect(
            escrow.connect(outsider).fundOrder(1n, { value: amount })
        ).to.be.revertedWith("ONLY_BUYER");
    });

    it("rejects an incorrect ETH amount", async function () {
        await expect(
            escrow.connect(buyer).fundOrder(1n, { value: amount - 1n })
        ).to.be.revertedWith("INCORRECT_VALUE");
    });

    it("allows buyer to fund with the exact amount", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });

        const order = await escrow.getOrder(1n);

        expect(order.status).to.equal(1n);
        expect(
            await hardhatEthers.provider.getBalance(await escrow.getAddress())
        ).to.equal(amount);
    });

    it("only seller can mark an order as shipped", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });

        await expect(
            escrow.connect(outsider).markShipped(1n)
        ).to.be.revertedWith("ONLY_SELLER");

        await escrow.connect(seller).markShipped(1n);

        const order = await escrow.getOrder(1n);
        expect(order.status).to.equal(2n);
    });

    it("does not allow seller to mark shipped at or after deadline", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });
        await time.increaseTo(deadline);

        await expect(
            escrow.connect(seller).markShipped(1n)
        ).to.be.revertedWith("SHIPPING_DEADLINE_PASSED");
    });

    it("pays seller after buyer confirms receipt", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });
        await escrow.connect(seller).markShipped(1n);

        const sellerBefore = await hardhatEthers.provider.getBalance(seller.address);

        await escrow.connect(buyer).confirmReceived(1n);

        const sellerAfter = await hardhatEthers.provider.getBalance(seller.address);
        const order = await escrow.getOrder(1n);

        expect(sellerAfter - sellerBefore).to.equal(amount);
        expect(order.status).to.equal(3n);
        expect(
            await hardhatEthers.provider.getBalance(await escrow.getAddress())
        ).to.equal(0n);
    });

    it("does not allow buyer to confirm before seller marks shipped", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });

        await expect(
            escrow.connect(buyer).confirmReceived(1n)
        ).to.be.revertedWith("INVALID_STATUS");
    });

    it("refunds buyer after deadline if seller has not marked shipped", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });
        await time.increaseTo(deadline);

        await expect(
            escrow.connect(buyer).refundOrder(1n)
        )
            .to.emit(escrow, "OrderRefunded")
            .withArgs(1n, buyer.address, amount);

        const order = await escrow.getOrder(1n);

        expect(order.status).to.equal(4n);
        expect(
            await hardhatEthers.provider.getBalance(await escrow.getAddress())
        ).to.equal(0n);
    });

    it("does not allow refund before deadline", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });

        await expect(
            escrow.connect(buyer).refundOrder(1n)
        ).to.be.revertedWith("REFUND_NOT_AVAILABLE");
    });

    it("does not allow refund after seller has marked shipped", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });
        await escrow.connect(seller).markShipped(1n);
        await time.increaseTo(deadline);

        await expect(
            escrow.connect(buyer).refundOrder(1n)
        ).to.be.revertedWith("INVALID_STATUS");
    });

    it("does not allow a second payout", async function () {
        await escrow.connect(buyer).fundOrder(1n, { value: amount });
        await escrow.connect(seller).markShipped(1n);
        await escrow.connect(buyer).confirmReceived(1n);

        await expect(
            escrow.connect(buyer).confirmReceived(1n)
        ).to.be.revertedWith("INVALID_STATUS");
    });
});