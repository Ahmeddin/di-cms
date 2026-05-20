export const BASE_CURRENCY = "USD";

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  ETB: 110.0, // 1 USD = 110 ETB
  EUR: 0.92,  // 1 USD = 0.92 EUR
  GBP: 0.79,  // 1 USD = 0.79 GBP
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  ETB: "Br. ",
  EUR: "€",
  GBP: "£",
};

/**
 * Converts a value from the BASE_CURRENCY (USD) to a target display currency
 */
export function convertFromBase(amount: number | string, targetCurrency: string): number {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 0;
  
  const rate = EXCHANGE_RATES[targetCurrency.toUpperCase()] || 1.0;
  return Number((numAmount * rate).toFixed(2));
}

/**
 * Converts a value from a display currency to the BASE_CURRENCY (USD)
 */
export function convertToBase(amount: number | string, sourceCurrency: string): number {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 0;

  const rate = EXCHANGE_RATES[sourceCurrency.toUpperCase()] || 1.0;
  return Number((numAmount / rate).toFixed(2));
}
