import { BrowserProvider, formatEther, type Eip1193Provider } from 'ethers'
import { config } from '../config'
import type { WalletInfo } from './types'

export interface InjectedProvider extends Eip1193Provider {
  isMetaMask?: boolean
  providers?: InjectedProvider[]
  on(event: string, listener: (...args: unknown[]) => void): void
  removeListener(event: string, listener: (...args: unknown[]) => void): void
}
declare global { interface Window { ethereum?: InjectedProvider } }
let discovered: InjectedProvider | undefined
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    const detail = (event as CustomEvent<{ info: { rdns: string }; provider: InjectedProvider }>).detail
    if (detail?.info?.rdns === 'io.metamask') discovered = detail.provider
  })
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}
export function injected() {
  const provider = discovered || window.ethereum?.providers?.find(p => p.isMetaMask) || (window.ethereum?.isMetaMask ? window.ethereum : undefined)
  if (!provider) throw new Error('Chưa tìm thấy MetaMask. Hãy cài tiện ích MetaMask trên trình duyệt rồi tải lại trang.')
  return provider
}
export async function walletInfo(requestAccess = false): Promise<WalletInfo | null> {
  const wallet = injected()
  const accounts = await wallet.request({ method: requestAccess ? 'eth_requestAccounts' : 'eth_accounts' }) as string[]
  if (!accounts.length) return null
  const provider = new BrowserProvider(wallet)
  const network = await provider.getNetwork()
  return { account: accounts[0], balance: formatEther(await provider.getBalance(accounts[0])), chainId: Number(network.chainId) }
}
export async function switchNetwork() {
  const wallet = injected()
  try { await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + config.chainId.toString(16) }] }) }
  catch (error) {
    if ((error as { code?: number }).code !== 4902 || config.chainId !== 31337) throw error
    await wallet.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x7a69', chainName: 'Hardhat Local', rpcUrls: [config.rpcUrl], nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } }] })
  }
}
