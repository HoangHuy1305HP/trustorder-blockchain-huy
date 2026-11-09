import { useCallback, useEffect, useRef, useState } from 'react'
import { config } from './config'
import { errorMessage, type Action, type NewOrder, type Order } from './domain'
import { DEMO_BUYER, demoService } from './services/demo'
import { liveService } from './services/live'
import { injected, switchNetwork, walletInfo } from './services/wallet'
import type { WalletInfo } from './services/types'

export type Transaction = { phase: 'signing' | 'pending' | 'success' | 'failed'; label: string; hash?: string; error?: string }
export function useEscrow() {
  const [mode, setMode] = useState<'demo' | 'live'>(config.initialMode)
  const [account, setAccount] = useState(DEMO_BUYER)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const locked = useRef(false)
  const epoch = useRef(0)
  const request = useRef(0)
  const activeAccount = mode === 'demo' ? account : wallet?.account || ''
  const service = mode === 'demo' ? demoService : liveService
  const wrongNetwork = mode === 'live' && !!wallet && wallet.chainId !== config.chainId
  const busy = transaction?.phase === 'signing' || transaction?.phase === 'pending'

  const refresh = useCallback(async () => {
    const version = ++request.current
    setLoading(true); setError('')
    if (mode === 'live' && (!wallet || wrongNetwork)) {
      setOrders([]); setBalance('0'); setLoading(false); return
    }
    try {
      const [rows, eth] = await Promise.all([service.list(), service.balance(activeAccount)])
      if (version !== request.current) return
      setOrders(rows); setBalance(eth)
    } catch (e) {
      if (version === request.current) { setOrders([]); setBalance('0'); setError(errorMessage(e)) }
    } finally { if (version === request.current) setLoading(false) }
  }, [activeAccount, mode, service, wallet, wrongNetwork])

  useEffect(() => { void refresh(); return () => { request.current++ } }, [refresh])
  useEffect(() => {
    if (mode !== 'live') return
    const timer = window.setInterval(() => { if (!locked.current) void refresh() }, 15000)
    return () => clearInterval(timer)
  }, [mode, refresh])
  useEffect(() => {
    if (mode !== 'live') return
    let disposed = false
    let walletRequest = 0
    const sync = async () => {
      const version = ++walletRequest
      epoch.current++; request.current++; setOrders([]); setBalance('0')
      try { const info = await walletInfo(); if (!disposed && version === walletRequest) setWallet(info) }
      catch (e) { if (!disposed && version === walletRequest) { setWallet(null); setError(errorMessage(e)) } }
    }
    const disconnected = () => { epoch.current++; request.current++; walletRequest++; setWallet(null); setOrders([]); setBalance('0') }
    let provider: ReturnType<typeof injected> | undefined
    try {
      provider = injected()
      provider.on('accountsChanged', sync); provider.on('chainChanged', sync); provider.on('disconnect', disconnected)
      void sync()
    } catch (e) { setError(errorMessage(e)) }
    return () => {
      disposed = true
      provider?.removeListener('accountsChanged', sync); provider?.removeListener('chainChanged', sync); provider?.removeListener('disconnect', disconnected)
    }
  }, [mode])

  async function connect() {
    setConnecting(true); setError('')
    try { setWallet(await walletInfo(true)) } catch (e) { setError(errorMessage(e)) }
    finally { setConnecting(false) }
  }
  async function changeNetwork() {
    setConnecting(true); setError('')
    try { await switchNetwork(); setWallet(await walletInfo()) } catch (e) { setError(errorMessage(e)) }
    finally { setConnecting(false) }
  }
  function changeMode(next: 'demo' | 'live') {
    if (locked.current) return
    epoch.current++; request.current++; setOrders([]); setWallet(null); setError(''); setTransaction(null); setMode(next)
  }
  async function execute(label: string, operation: (progress: (phase: 'signing' | 'pending', hash?: string) => void) => Promise<void>) {
    if (locked.current) return false
    locked.current = true
    const context = epoch.current
    let lastHash: string | undefined
    setTransaction({ phase: 'signing', label }); setError('')
    try {
      await operation((phase, hash) => { if (hash) lastHash = hash; setTransaction({ phase, label, hash: lastHash }) })
      setTransaction({ phase: 'success', label, hash: lastHash })
      if (context === epoch.current) await refresh()
      return true
    } catch (e) { setTransaction({ phase: 'failed', label, hash: lastHash, error: errorMessage(e) }); return false }
    finally { locked.current = false }
  }
  const create = (input: NewOrder) => execute('Tạo đơn hàng', p => service.create(input, activeAccount, p))
  const act = (action: Action, order: Order, label: string) => execute(label, p => service.act(action, order, activeAccount, p))
  return { mode, changeMode, account: activeAccount, setAccount, wallet, orders, balance, loading, connecting, error, transaction, setTransaction, busy, wrongNetwork, refresh, connect, changeNetwork, create, act }
}
