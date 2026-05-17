import { type FC, type ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork, type Adapter } from '@solana/wallet-adapter-base'
import { CoinbaseWalletAdapter } from '@solana/wallet-adapter-coinbase'
import { KeystoneWalletAdapter } from '@solana/wallet-adapter-keystone'
import { LedgerWalletAdapter } from '@solana/wallet-adapter-ledger'
import { NekoWalletAdapter } from '@solana/wallet-adapter-neko'
import { OntoWalletAdapter } from '@solana/wallet-adapter-onto'
import { ParticleAdapter } from '@solana/wallet-adapter-particle'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SalmonWalletAdapter } from '@solana/wallet-adapter-salmon'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect'
import { useStandardWalletAdapters } from '@solana/wallet-standard-wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { isAllowedSubscriptionWallet } from './payments/subscriptionPaymentConfig'

import '@solana/wallet-adapter-react-ui/styles.css'

interface WalletContextProviderProps {
  children: ReactNode
}

type SupportedWalletNetwork = WalletAdapterNetwork.Mainnet | WalletAdapterNetwork.Devnet

function uniqueAllowedAdapters(adapters: Adapter[]): Adapter[] {
  const seen = new Set<string>()

  return adapters.filter((adapter) => {
    const key = adapter.name.toLowerCase()
    if (seen.has(key) || !isAllowedSubscriptionWallet(adapter.name)) return false
    seen.add(key)
    return true
  })
}

function resolveWalletNetwork(value: string | undefined): SupportedWalletNetwork {
  return value?.toLowerCase() === 'devnet' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  const network = resolveWalletNetwork(import.meta.env.VITE_SOLANA_NETWORK)
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined
  const standardAdapters = useStandardWalletAdapters([])
  const endpoint = useMemo(
    () => import.meta.env.VITE_SOLANA_RPC_URL ?? clusterApiUrl(network),
    [network],
  )
  const explicitAdapters = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new CoinbaseWalletAdapter(),
      new KeystoneWalletAdapter(),
      new LedgerWalletAdapter(),
      new NekoWalletAdapter(),
      new OntoWalletAdapter(),
      new ParticleAdapter(),
      new SalmonWalletAdapter({ network }),
      ...(walletConnectProjectId
        ? [
            new WalletConnectWalletAdapter({
              network,
              options: {
                projectId: walletConnectProjectId,
              },
            }),
          ]
        : []),
    ],
    [network, walletConnectProjectId],
  )

  const wallets = useMemo(
    () => uniqueAllowedAdapters([...explicitAdapters, ...standardAdapters]),
    [explicitAdapters, standardAdapters],
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
