import type { Action, NewOrder, Order } from '../domain'

export type TxProgress = (phase: 'signing' | 'pending', hash?: string) => void
export interface WalletInfo { account: string; balance: string; chainId: number }
export interface OrderService {
  list(): Promise<Order[]>
  create(input: NewOrder, account: string, progress: TxProgress): Promise<void>
  act(action: Action, order: Order, account: string, progress: TxProgress): Promise<void>
  balance(account: string): Promise<string>
}
