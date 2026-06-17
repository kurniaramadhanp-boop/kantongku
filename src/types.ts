export type PocketType = string;

export interface Pocket {
  id: PocketType;
  name: string;
  balance: number;
  icon: string;
  tag: string;
  color: string; // Tailwind color class or hex string
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  icon: string; // bank, wallet, smartphone, cash, etc.
  color: string; // theme color
  tag?: string; // e.g. "Rekening Utama"
}

export type CategoryType = string;

export interface Category {
  id: CategoryType;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'incoming' | 'outgoing';
  pocketId: PocketType;
  accountId: string; // Link to Rekening / Dompet
  category: CategoryType;
  date: string; // ISO String or Date representation
  notes?: string;
}

export interface Budget {
  id: string;
  title: string;
  spent: number;
  limit: number;
  category: CategoryType;
  sisaPercent: number;
  type: 'expense_limit' | 'target_funding'; // expense limit has threshold alerts, target funding accumulates towards a target
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'warning' | 'success';
}

export interface UserProfile {
  email: string;
  name: string;
  avatarUrl: string;
  joinedAt: string;
}
