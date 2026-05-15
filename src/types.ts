
export interface Signal {
  id: string;
  asset: string;
  symbol: string; // The TV symbol
  type: 'BOS' | 'OB' | 'FVG' | 'LIQUIDITY' | 'TREND' | 'VSA';
  bias: 'bullish' | 'bearish';
  time: string;
  timeframe: string;
  entry?: string;
  tp1?: string;
  tp2?: string;
  tp3?: string;
  stop?: string;
  currentPrice?: string;
  confidence: number;
  pattern: string;
  sentiment?: number; // 0-100
  status: 'active' | 'pending' | 'executed';
  executionLabel: string; // "Signal Received now", "Entry is Active", "Executed Entry"
  isConfirmed: boolean;
  confirmationReason?: string;
  reason: string;
  vsaReason?: string;
  verificationProgress: number; // 0-100
  factors: {
    structure: 'weak' | 'confirming' | 'strong';
    waves: 'weak' | 'confirming' | 'strong';
    cabling: 'weak' | 'confirming' | 'strong';
    levels: 'weak' | 'confirming' | 'strong';
  };
}
