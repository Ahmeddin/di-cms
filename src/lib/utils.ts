import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { CURRENCY_SYMBOLS } from "./currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrencySymbol(currency: string = "USD") {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

export function formatPrice(amount: number | string, currency: string = "USD") {
  const symbol = getCurrencySymbol(currency);
  const val = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(val)) return `${symbol}0.00`;
  
  const formatted = val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return `${symbol}${formatted}`;
}
