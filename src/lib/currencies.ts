import { getAllLocationCountries } from "./location-data";

export interface CurrencyOption {
  code: string;
  label: string;
  searchText: string;
}

const PRIORITY_CURRENCIES = ["ZAR", "USD", "GBP", "EUR", "AUD", "CAD", "NZD"] as const;

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function getCurrencyOptions(): readonly CurrencyOption[] {
  const currencyCodes = new Set<string>();

  getAllLocationCountries().forEach((country) => {
    if (country.currency) {
      currencyCodes.add(country.currency);
    }
  });

  return Array.from(currencyCodes)
    .sort((a, b) => {
      const aPriority = PRIORITY_CURRENCIES.indexOf(a as (typeof PRIORITY_CURRENCIES)[number]);
      const bPriority = PRIORITY_CURRENCIES.indexOf(b as (typeof PRIORITY_CURRENCIES)[number]);

      if (aPriority !== -1 || bPriority !== -1) {
        if (aPriority === -1) {
          return 1;
        }

        if (bPriority === -1) {
          return -1;
        }

        return aPriority - bPriority;
      }

      return a.localeCompare(b);
    })
    .map((code) => ({
      code,
      label: code,
      searchText: normalizeSearchValue(code)
    }));
}

export function searchCurrencies(query: string, limit = 10): CurrencyOption[] {
  const normalizedQuery = normalizeSearchValue(query);

  return getCurrencyOptions()
    .filter((currency) => (normalizedQuery ? currency.searchText.includes(normalizedQuery) : true))
    .slice(0, limit);
}
