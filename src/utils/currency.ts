/**
 * Currency formatting utilities
 */

export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR";

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; locale: string }> = {
    USD: { symbol: "$", locale: "en-US" },
    EUR: { symbol: "€", locale: "de-DE" },
    GBP: { symbol: "£", locale: "en-GB" },
    INR: { symbol: "₹", locale: "en-IN" },
};

export function formatCurrency(amount: number, currency: CurrencyCode = "USD"): string {
    return new Intl.NumberFormat(CURRENCY_CONFIG[currency]?.locale ?? "en-US", {
        style: "currency",
        currency,
    }).format(amount);
}

export function isValidCurrency(code: string): code is CurrencyCode {
    return code in CURRENCY_CONFIG;
}

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_CONFIG) as CurrencyCode[];
