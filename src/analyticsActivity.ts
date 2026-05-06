export const backendActivityFilters = [
  "all",
  "processing",
  "completed",
  "failed",
] as const;

export type BackendActivityStatus = (typeof backendActivityFilters)[number];

export type ProcessedTx = {
  wallet: string | null;
  signature: string;
  status: string;
  retry_count: number | null;
  created_at: string;
};

export type BackendActivityCounts = Record<BackendActivityStatus, number>;

export function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

export function formatTransactionSignature(signature: string): string {
  return `${signature.slice(0, 15)}...`;
}

export function formatCompactWallet(wallet: string | null): string {
  if (!wallet) return "unknown";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export function getStatusClass(status: string): string {
  const normalized = normalizeStatus(status);

  if (normalized === "completed") return "text-green-400";
  if (normalized === "failed") return "text-red-400";
  if (normalized === "processing") return "text-yellow-300";

  return "text-muted-foreground";
}

export function getStatusBadgeClass(status: string): string {
  const normalized = normalizeStatus(status);

  if (normalized === "completed") {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  if (normalized === "failed") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (normalized === "processing") {
    return "border-yellow-300/30 bg-yellow-300/10 text-yellow-200";
  }

  return "border-white/10 bg-white/5 text-muted-foreground";
}

export function filterBackendActivity(
  transactions: ProcessedTx[],
  filter: BackendActivityStatus,
  search = "",
): ProcessedTx[] {
  const query = search.trim().toLowerCase();

  return transactions.filter((tx) => {
    const status = normalizeStatus(tx.status);
    const matchesStatus = filter === "all" || status === filter;

    if (!matchesStatus) return false;
    if (!query) return true;

    return (
      tx.signature.toLowerCase().includes(query) ||
      (tx.wallet ?? "").toLowerCase().includes(query) ||
      status.includes(query)
    );
  });
}

export function getBackendActivityCounts(
  transactions: ProcessedTx[],
): BackendActivityCounts {
  const counts: BackendActivityCounts = {
    all: transactions.length,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  transactions.forEach((tx) => {
    const status = normalizeStatus(tx.status);

    if (
      status === "processing" ||
      status === "completed" ||
      status === "failed"
    ) {
      counts[status] += 1;
    }
  });

  return counts;
}
