export interface Transaction {
  id: string;
  ownerId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  createdAt: string; // ISO string or Server Timestamp representation
  updatedAt: string;
}

export interface CategoryOption {
  value: string;
  label: string;
  icon: string; // Lucide icon identifier
  color: string; // Tailwind class color e.g. "bg-emerald-500"
  textColor: string; // e.g., "text-emerald-500"
}

export type ThemeType = 'light'; // Standard light mode only as instructed
