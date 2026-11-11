/** Core data model. Amounts are integers in minor units (paise, cents). */
export type ISODate = string; // 'YYYY-MM-DD', always local calendar date
export type TxType = 'expense' | 'income';
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';
export type ThemeName = 'dark' | 'light' | 'green';

/**
 * When savings are set aside.
 * - 'start': pay yourself first. Savings are reserved on day 1 from planned income.
 * - 'end':   save what is left. Savings are counted from income actually received.
 */
export type SaveRule = 'start' | 'end';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  date: ISODate;
  note: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: ISODate | null;
  createdAt: number;
}

/** categoryId 'overall' is the whole-month budget. */
export interface Budget {
  categoryId: string;
  amount: number;
}

export interface Settings {
  currency: CurrencyCode;
  theme: ThemeName;
  monthlyIncome: number;
  monthlySavingsTarget: number;
  saveRule: SaveRule;
  effects3d: boolean;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
  theme: 'dark',
  monthlyIncome: 0,
  monthlySavingsTarget: 0,
  saveRule: 'start',
  effects3d: true,
  onboarded: false,
};

export const OVERALL = 'overall';
