import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletContextProvider } from './WalletProvider';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface VestingScheduleForm {
  beneficiary: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
  cliffDate: string;
  description: string;
}

export function AdminPanel() {
  const { publicKey } = useWallet();
  useConnection();
  // List of admin wallet addresses (YOUR wallets)
  const ADMIN_WALLETS = [
    'DbiGhLSemaRXB9jmY6s3PZfPzwYDpwozJo5uKux6nnE9', // Your devnet wallet
    // Add your mainnet wallet here later
 ];

  const isAdmin = publicKey ? ADMIN_WALLETS.includes(publicKey.toBase58()) : false;
  const [formData, setFormData] = useState<VestingScheduleForm>({
    beneficiary: '',
    totalAmount: 0,
    startDate: '',
    endDate: '',
    cliffDate: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    setCreating(true);

    try {
      console.log('Creating vesting schedule:', formData);

      // TODO: Replace with actual Bonfida contract call
      // For now, save to backend
      const response = await fetch('http://localhost:8000/admin/create-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creator: publicKey.toBase58()
        })
      });

      if (response.ok) {
        alert('✅ Vesting schedule created successfully!');
        // Reset form
        setFormData({
          beneficiary: '',
          totalAmount: 0,
          startDate: '',
          endDate: '',
          cliffDate: '',
          description: ''
        });
      } else {
        alert('Failed to create schedule');
      }

    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating vesting schedule');
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>⛔ Access Denied</h2>
          <p>You don't have admin privileges</p>
        </div>
      </div>
    );
  }

  return (
  <WalletContextProvider>
    <div className="admin-panel">
      <div className="admin-wallet-button">
        <WalletMultiButton />
      </div>

      {!publicKey ? (
        <div className="access-denied">
          <h2>🔐 Connect Wallet to Access Admin</h2>
          <p>Please connect your admin wallet</p>
        </div>
      ) : !isAdmin ? (
        <div className="access-denied">
          <h2>⛔ Access Denied</h2>
          <p>You don't have admin privileges</p>
          <p style={{fontSize: '0.8rem', opacity: 0.6, marginTop: '1rem'}}>
            Connected: {publicKey.toBase58().slice(0, 8)}...
          </p>
        </div>
      ) : (
        <>
          <div className="admin-header">
            <h1>🔧 Admin Panel</h1>
            <p>Create and manage vesting schedules</p>
          </div>

          <div className="admin-content">
        <div className="create-schedule-card">
          <h2>Create New Vesting Schedule</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Beneficiary Wallet Address *</label>
              <input
                type="text"
                value={formData.beneficiary}
                onChange={(e) => setFormData({...formData, beneficiary: e.target.value})}
                placeholder="Solana wallet address"
                required
              />
            </div>

            <div className="form-group">
              <label>Total Token Amount *</label>
              <input
                type="number"
                value={formData.totalAmount || ''}
                onChange={(e) => setFormData({...formData, totalAmount: Number(e.target.value)})}
                placeholder="10000"
                min="0"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Cliff Date (Optional)</label>
              <input
                type="date"
                value={formData.cliffDate}
                onChange={(e) => setFormData({...formData, cliffDate: e.target.value})}
              />
              <small>No tokens vest until this date</small>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Advisor vesting, Team tokens, etc."
                rows={3}
              />
            </div>

            <button 
              type="submit" 
              className="create-button"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Vesting Schedule'}
            </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  </WalletContextProvider>
);
}