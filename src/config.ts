import { isAddress, ZeroAddress } from 'ethers'

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 31337)
export const config = {
  initialMode: import.meta.env.VITE_APP_MODE === 'live' ? 'live' as const : 'demo' as const,
  chainId,
  rpcUrl: import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545',
  address: import.meta.env.VITE_CONTRACT_ADDRESS || '',
}
export function checkConfig() {
  if (!Number.isSafeInteger(config.chainId) || config.chainId <= 0) throw new Error('VITE_CHAIN_ID không hợp lệ.')
  if (!isAddress(config.address) || config.address === ZeroAddress) throw new Error('Chưa cấu hình địa chỉ contract. Xem .env.example và docs/CONTRACT_HANDOFF.md.')
}
