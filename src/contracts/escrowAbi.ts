// Proposed interface only. Replace with Hùng's compiled ABI and adjust live.ts after handoff.
export const escrowAbi = [
  'function orderCount() view returns (uint256)',
  'function getOrder(uint256 id) view returns (tuple(uint256 id, string title, string description, address seller, address buyer, uint256 amount, uint256 createdAt, uint256 deadline, uint8 status))',
  'function createOrder(string title, string description, address buyer, uint256 amount, uint256 deadline)',
  'function fundOrder(uint256 id) payable',
  'function markShipped(uint256 id)',
  'function confirmReceived(uint256 id)',
  'function refundOrder(uint256 id)',
] as const
