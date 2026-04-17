// Static exchange rates relative to USD.
// In production, replace with a live API (e.g. Open Exchange Rates).
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  AUD: 0.65,
  CAD: 0.74,
  CHF: 1.13,
  CNY: 0.14,
  INR: 0.012,
  KRW: 0.00075,
  SGD: 0.74,
  THB: 0.028,
  IDR: 0.000063,
  MYR: 0.21,
  VND: 0.000041,
  PHP: 0.018,
  NZD: 0.61,
  SEK: 0.096,
  NOK: 0.094,
  DKK: 0.14,
  MXN: 0.058,
  BRL: 0.20,
  ZAR: 0.055,
  AED: 0.27,
  HKD: 0.13,
  TWD: 0.031,
};

export const SUPPORTED_CURRENCIES = Object.keys(RATES_TO_USD);

export function convertToUSD(amount: number, fromCurrency: string): number {
  const rate = RATES_TO_USD[fromCurrency.toUpperCase()];
  if (rate == null) return amount;
  return Math.round(amount * rate * 100) / 100;
}
