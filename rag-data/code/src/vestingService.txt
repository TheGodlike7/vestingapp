// Vesting service - currently using mock data
// In production: integrate with @bonfida/token-vesting SDK
export interface VestingScheduleInfo {
  id: string;
  beneficiary: string;
  totalAmount: number;
  startDate: Date;
  endDate: Date;
  cliffDate: Date | null;
  releasedAmount: number;
  vestedAmount: number;
  remainingAmount: number;
}

export async function getVestingSchedulesForWallet(
  walletAddress: string
): Promise<VestingScheduleInfo[]> {
  // For MVP: Return mock data to demonstrate UI
  // In production, this would query actual Bonfida contracts
  
  console.log('Querying vesting schedules for:', walletAddress);
  
  // Mock vesting schedule data
  const mockSchedules: VestingScheduleInfo[] = [
    {
      id: '1',
      beneficiary: walletAddress,
      totalAmount: 10000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2028-01-01'),
      cliffDate: new Date('2026-07-01'),
      releasedAmount: 1500,
      vestedAmount: 2500,
      remainingAmount: 7500,
    },
    {
      id: '2',
      beneficiary: walletAddress,
      totalAmount: 5000,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2027-06-01'),
      cliffDate: null,
      releasedAmount: 2000,
      vestedAmount: 3000,
      remainingAmount: 2000,
    },
  ];
  
  return mockSchedules;
}

export function calculateProgress(schedule: VestingScheduleInfo): number {
  const now = Date.now();
  const start = schedule.startDate.getTime();
  const end = schedule.endDate.getTime();
  
  if (now < start) return 0;
  if (now >= end) return 100;
  
  return ((now - start) / (end - start)) * 100;
}