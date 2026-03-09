const API_BASE_URL = 'http://localhost:8000';

export interface WalletData {
  wallet: string;
  balance: number;
  transactions: number;
  last_updated: string;
}

export async function getWalletFromDB(address: string): Promise<WalletData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/${address}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching wallet from DB:', error);
    return null;
  }
}

export async function getWalletLive(address: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/${address}/live`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching live wallet data:', error);
    return null;
  }
}