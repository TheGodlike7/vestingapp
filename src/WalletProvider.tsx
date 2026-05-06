import { type FC, type ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork, type Adapter } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { useStandardWalletAdapters } from '@solana/wallet-standard-wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { isAllowedSubscriptionWallet } from './payments/subscriptionPaymentConfig'

import '@solana/wallet-adapter-react-ui/styles.css'

interface WalletContextProviderProps {
  children: ReactNode
}

function uniqueAllowedAdapters(adapters: Adapter[]): Adapter[] {
  const seen = new Set<string>()

  return adapters.filter((adapter) => {
    const key = adapter.name.toLowerCase()
    if (seen.has(key) || !isAllowedSubscriptionWallet(adapter.name)) return false
    seen.add(key)
    return true
  })
}

function resolveWalletNetwork(value: string | undefined): WalletAdapterNetwork {
  return value?.toLowerCase() === 'devnet' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  const network = resolveWalletNetwork(import.meta.env.VITE_SOLANA_NETWORK)
  const standardAdapters = useStandardWalletAdapters([])
  const endpoint = useMemo(
    () => import.meta.env.VITE_SOLANA_RPC_URL ?? clusterApiUrl(network),
    [network],
  )

  const wallets = useMemo(
    () =>
      uniqueAllowedAdapters([
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter({ network }),
        ...standardAdapters,
      ]),
    [network, standardAdapters],
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={async (adapter) => isAllowedSubscriptionWallet(adapter.name)}
        localStorageKey="vestingappSubscriptionWallet"
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
