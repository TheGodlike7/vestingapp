const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

export interface WalletData {
  wallet: string;
  balance: number;
  transactions: number;
  last_updated: string;
}

function apiUrl(path: string): string | null {
  if (!API_BASE_URL) {
    console.warn('VITE_API_BASE_URL is not configured.');
    return null;
  }

  return `${API_BASE_URL}${path}`;
}

export async function getWalletFromDB(address: string): Promise<WalletData | null> {
  try {
    const url = apiUrl(`/wallet/${address}`);
    if (!url) return null;

    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching wallet from DB:', error);
    return null;
  }
}

export async function getWalletLive(address: string): Promise<unknown> {
  try {
    const url = apiUrl(`/wallet/${address}/live`);
    if (!url) return null;

    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching live wallet data:', error);
    return null;
  }
}
