export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Account {
  id: string;
  name: string;
  type: 'PERSONAL' | 'BUSINESS' | 'MERCHANT' | 'EXCHANGE' | 'CASH_OUT';
  city: string;
  country: string;
  openedAt: string;
  synthetic: true;
}

export interface Transaction {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  timestamp: string;
  channel: 'ACH' | 'WIRE' | 'CARD' | 'P2P';
  location: string;
  scenario?: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  explanation: string;
}

export interface RiskAssessment {
  transactionId: string;
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  explanation: string;
}

export interface Dataset {
  accounts: Account[];
  transactions: Transaction[];
}

export type AttackType =
  | 'Money mule network'
  | 'Account takeover'
  | 'Rapid fund drain'
  | 'Layered transfers'
  | 'Circular transfer network';

export interface NetworkTrace {
  accountIds: string[];
  transactionIds: string[];
  totalValue: number;
  suspiciousNodes: number;
  suspiciousTransactions: number;
  pathLength: number;
  networkRisk: number;
}
