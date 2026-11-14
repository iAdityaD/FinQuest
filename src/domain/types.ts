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
  /** Day of the month the budgeting month starts on (1-28). 1 = calendar months. */
  monthStartDay: number;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
  theme: 'dark',
  monthlyIncome: 0,
  monthlySavingsTarget: 0,
  saveRule: 'start',
  effects3d: true,
  monthStartDay: 1,
  onboarded: false,
};

export const OVERALL = 'overall';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** A transaction that logs itself: rent, salary, subscriptions. */
export interface RecurringRule {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  note: string;
  frequency: Frequency;
  /** Every `interval` days, weeks, months or years. */
  interval: number;
  /** First occurrence. Monthly rules keep this day of the month. */
  anchorDate: ISODate;
  endDate: ISODate | null;
  /** Occurrences up to and including this date already exist. */
  lastRunDate: ISODate | null;
  active: boolean;
  /**
   * True for amounts that change each time (a variable salary, an electricity bill).
   * Nothing is logged automatically: each occurrence waits for the user to enter the amount.
   * `amount` is then only the usual figure offered as a starting point (0 = none).
   */
  askAmount: boolean;
  /**
   * Monthly and yearly rules only: fall on the last day of the month, whatever
   * its length (31, 30, 28 or 29), instead of on the anchor's day number.
   */
  monthEnd: boolean;
}
