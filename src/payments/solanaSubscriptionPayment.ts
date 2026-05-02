import { createTransfer } from '@solana/pay'
import { PublicKey, type Connection, type Transaction } from '@solana/web3.js'
import { BigNumber } from 'bignumber.js'
import type { PendingPaymentIntent } from './subscriptionPaymentTypes'

type SignTransaction = (transaction: Transaction) => Promise<Transaction>

type SubmitSubscriptionPaymentInput = {
  connection: Connection
  payer: PublicKey
  signTransaction: SignTransaction
  intent: PendingPaymentIntent
}

export async function submitSubscriptionPayment({
  connection,
  payer,
  signTransaction,
  intent,
}: SubmitSubscriptionPaymentInput): Promise<string> {
  const recipient = new PublicKey(intent.businessWallet)
  const splToken = new PublicKey(intent.tokenMint)
  const amount = new BigNumber(intent.amountUsdc)
  const latestBlockhash = await connection.getLatestBlockhash('confirmed')

  const transaction = await createTransfer(connection, payer, {
    recipient,
    splToken,
    amount,
    memo: intent.memo,
  })

  transaction.feePayer = payer
  transaction.recentBlockhash = latestBlockhash.blockhash

  const signedTransaction = await signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
    preflightCommitment: 'confirmed',
    skipPreflight: false,
  })

  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    'confirmed',
  )

  return signature
}
