/// <reference types="node" />
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { Buffer } from "buffer";

// 🔑 CONFIG
const HELIUS_RPC =
  process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com";
const FALLBACK_RPC =
  process.env.SOLANA_FALLBACK_RPC_URL ?? "https://api.devnet.solana.com";

// ✅ PRIMARY + FALLBACK CONNECTIONS
const heliusConnection = new Connection(HELIUS_RPC, "confirmed");
const fallbackConnection = new Connection(FALLBACK_RPC, "confirmed");

async function withFallback<T>(
  fn: (connection: Connection) => Promise<T>,
): Promise<T> {
  try {
    return await fn(heliusConnection);
  } catch (err) {
    const msg = String(err);

    console.warn("⚠️ Helius failed:", msg);

    // 🔥 "EVEN BETTER" LOGIC (only fallback on real network errors)
    if (
      msg.includes("fetch failed") ||
      msg.includes("failed to get info") ||
      msg.includes("ECONNREFUSED")
    ) {
      console.warn("🔁 Switching to fallback RPC...");

      return await fn(fallbackConnection);
    }

    // ❗ If it's not a network error → rethrow
    throw err;
  }
}

function parseSecretKey(value: string | undefined): Uint8Array {
  if (!value) {
    throw new Error("Set SENDER_SECRET_KEY to a JSON array of keypair bytes.");
  }

  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error("SENDER_SECRET_KEY must be a JSON array.");
  }

  const bytes = parsed.map((item) => {
    if (
      typeof item !== "number" ||
      !Number.isInteger(item) ||
      item < 0 ||
      item > 255
    ) {
      throw new Error("SENDER_SECRET_KEY contains an invalid byte.");
    }

    return item;
  });

  return Uint8Array.from(bytes);
}

const wallet = Keypair.fromSecretKey(parseSecretKey(process.env.SENDER_SECRET_KEY));

const USDC_MINT = new PublicKey(
  process.env.USDC_MINT ?? "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
);
const RECEIVER = new PublicKey(
  process.env.RECEIVER_WALLET ?? "DbiGhLSemaRXB9jmY6s3PZfPzwYDpwozJo5uKux6nnE9",
);

// 🧠 MEMO PROGRAM
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

const memo = process.env.PAYMENT_MEMO ?? "vestingapp-starter-60e430eb-5996-4162-b10e-8c40cfe4f9ff";

async function main() {
  // ✅ GET SENDER TOKEN ACCOUNT (WITH FALLBACK)
  const senderToken = await withFallback((connection) =>
    getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      USDC_MINT,
      wallet.publicKey,
    ),
  );

  // ✅ GET RECEIVER TOKEN ACCOUNT (WITH FALLBACK)
  const receiverToken = await withFallback((connection) =>
    getOrCreateAssociatedTokenAccount(connection, wallet, USDC_MINT, RECEIVER),
  );

  // Transfer 0.1 USDC (6 decimals)
  const transferIx = createTransferInstruction(
    senderToken.address,
    receiverToken.address,
    wallet.publicKey,
    100000, // 0.1 USDC
  );

  // Memo instruction
  const memoIx = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf-8"),
  });

  const tx = new Transaction().add(transferIx, memoIx);

  // ✅ SEND TX WITH FALLBACK
  const sig = await withFallback((connection) =>
    sendAndConfirmTransaction(connection, tx, [wallet]),
  );

  console.log("✅ TX SENT:", sig);
}

main();
