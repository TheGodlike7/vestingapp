import {Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction,} from "@solana/web3.js";
import { createTransferInstruction, getOrCreateAssociatedTokenAccount,} from "@solana/spl-token";
import { Buffer } from "buffer";

// 🔑 CONFIG
const RPC_URL = "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// 🔐 LOAD YOUR WALLET (PRIVATE KEY ARRAY)
const secret = Uint8Array.from([
    4, 14, 33, 250, 230, 108, 15, 144, 153, 128, 85, 184, 166, 53, 19, 154, 171, 96, 193, 44, 171, 249, 127, 101, 255, 150, 196, 218, 123, 199, 154, 123, 187, 48, 167, 203, 202, 79, 74, 84, 47, 121, 111, 224, 31, 152, 204, 166, 15, 201, 108, 249, 245, 0, 194, 81, 55, 115, 227, 5, 231, 198, 0, 6
]);
const wallet = Keypair.fromSecretKey(secret);

// 📍 EDIT THESE
const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
const RECEIVER = new PublicKey("DbiGhLSemaRXB9jmY6s3PZfPzwYDpwozJo5uKux6nnE9");

// 🧠 MEMO PROGRAM
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

// 📝 YOUR MEMO
const memo = "vestingapp-starter-60e430eb-5996-4162-b10e-8c40cfe4f9ff";

async function main() {
  // Get token accounts
  const senderToken = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    USDC_MINT,
    wallet.publicKey
  );

  const receiverToken = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    USDC_MINT,
    RECEIVER
  );

  // Transfer 0.1 USDC (6 decimals)
  const transferIx = createTransferInstruction(
    senderToken.address,
    receiverToken.address,
    wallet.publicKey,
    100000 // 0.1 USDC
  );

  // Memo instruction
  const memoIx = {
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf-8"),
  };

  const tx = new Transaction().add(transferIx, memoIx);

  const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);

  console.log("✅ TX SENT:", sig);
}

main();