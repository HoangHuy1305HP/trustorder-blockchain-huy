import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TrustOrderModule = buildModule("TrustOrderModule", (m) => {
    const escrow = m.contract("TrustOrderEscrow");
    return { escrow };
});

export default TrustOrderModule;