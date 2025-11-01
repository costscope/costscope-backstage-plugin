import { configApiRef, useApi } from '@backstage/core-plugin-api';
import React, { createContext, useContext, useMemo } from 'react';

// Formatting context centralizes currency & percent formatting with locale detection.

const CONFIG_CURRENCY_PATH = 'costscope.currency';
const CONFIG_LOCALE_PATH = 'costscope.locale';

/** @public */
export interface FormattingContextValue {
  locale: string;
  currency: string;
  formatCurrency: (value: number | null | undefined, opts?: { maximumFractionDigits?: number }) => string;
  formatCurrencyCompact: (value: number | null | undefined, opts?: { maximumFractionDigits?: number }) => string;
  formatPercent: (value: number | null | undefined, opts?: { fractionDigits?: number }) => string;
}

const FormattingContext = createContext<FormattingContextValue | undefined>(undefined);

function detectLocale(): string {
  try {
    const g: any = typeof globalThis !== 'undefined' ? globalThis : {};
    const nav: any = g.navigator;
    if (nav) {
      const langs = nav.languages && nav.languages.length ? nav.languages : [nav.language];
      if (langs && langs.length && typeof langs[0] === 'string') return langs[0];
    }
  } catch {
    // ignore
  }
  return 'en-US';
}

export function createFormatters(locale: string, currency: string) {
  const baseCurrencyFormatter = new Intl.NumberFormat(locale || 'en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  });
  const formatCurrency: FormattingContextValue['formatCurrency'] = (value, opts) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '–';
    if (opts?.maximumFractionDigits != null && opts.maximumFractionDigits !== 2) {
      try {
        return new Intl.NumberFormat(locale || 'en-US', {
          style: 'currency',
          currency: currency || 'USD',
          maximumFractionDigits: opts.maximumFractionDigits,
        }).format(value);
      } catch {
        return baseCurrencyFormatter.format(value);
      }
    }
    return baseCurrencyFormatter.format(value);
  };
  const formatCurrencyCompact: FormattingContextValue['formatCurrencyCompact'] = (value, opts) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '–';
    try {
      return new Intl.NumberFormat(locale || 'en-US', {
        style: 'currency',
        currency: currency || 'USD',
        notation: 'compact',
        maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
      }).format(value);
    } catch {
      // Fallback: manual compact formatting independent of locale compact support.
      // We intentionally avoid regex-based stripping of all non-digits for performance & predictability.
      const abs = Math.abs(value);
      const sign = value < 0 ? '-' : '';
      const suffixes: [number, string][] = [
        [1e12, 'T'],
        [1e9, 'B'],
        [1e6, 'M'],
        [1e3, 'K'],
      ];

      // Derive currency placement (prefix/suffix) once using an integer format with zero fraction digits.
      // Example: en-US USD => prefix "$", suffix ""; de-DE EUR => prefix "", suffix " €".
      // We memoize via closure variable stored on the function (not exported) to avoid recomputing.
      interface Pattern { prefix: string; suffix: string }
      const selfAny: any = formatCurrencyCompact as any;
      let pattern: Pattern | undefined = selfAny.__currencyPattern;
      if (!pattern) {
        try {
          const patternFormatter = new Intl.NumberFormat(locale || 'en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
          const sample = patternFormatter.format(1); // e.g. "$1" or "1 €"
          // find first ASCII digit (we formatted integer so there is exactly one run of digits)
          let firstDigit = -1;
          for (let i = 0; i < sample.length; i++) {
            const c = sample[i];
            if (c >= '0' && c <= '9') { firstDigit = i; break; }
          }
          let lastDigit = firstDigit;
          for (let i = firstDigit + 1; i < sample.length; i++) {
            const c = sample[i];
            if (c >= '0' && c <= '9') lastDigit = i; else break;
          }
          if (firstDigit >= 0) {
            pattern = { prefix: sample.slice(0, firstDigit), suffix: sample.slice(lastDigit + 1) };
          } else {
            pattern = { prefix: '', suffix: '' }; // fallback if unexpected
          }
        } catch {
          pattern = { prefix: '', suffix: '' };
        }
        selfAny.__currencyPattern = pattern;
      }

      const maxFrac = opts?.maximumFractionDigits ?? 2;
      const formatNumeric = (num: number) => {
        // Use toFixed for deterministic point separator, then trim trailing zeros & optional dot.
        let s = num.toFixed(Math.min(6, Math.max(0, maxFrac))); // clamp for safety
        // Manual trim (no regex): remove trailing zeros then optional '.'
        if (s.includes('.')) {
          while (s.endsWith('0')) s = s.slice(0, -1);
          if (s.endsWith('.')) s = s.slice(0, -1);
        }
        return s;
      };

      for (const [div, suf] of suffixes) {
        if (abs >= div) {
          const scaled = abs / div;
          return `${sign}${pattern!.prefix}${formatNumeric(scaled)}${pattern!.suffix}${suf}`;
        }
      }
      // No suffix; fall back to standard formatter (non-compact) since value < 1e3.
      return baseCurrencyFormatter.format(value);
    }
  };
  const formatPercent: FormattingContextValue['formatPercent'] = (value, opts) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '–';
    const digits = opts?.fractionDigits ?? 1;
    return `${(value * 100).toFixed(digits)}%`;
  };
  return { formatCurrency, formatCurrencyCompact, formatPercent };
}

/** @public */
export const FormattingProvider = ({ children, currency: overrideCurrency, locale: overrideLocale, configApi: overrideConfigApi }: { children: React.ReactNode; currency?: string; locale?: string; configApi?: { getOptionalString(path: string): string | undefined } }) => {
  let currency = overrideCurrency;
  let locale = overrideLocale;
  try {
    // Prefer explicit override (useful in tests) else use Backstage Api
    const configApi = overrideConfigApi ?? useApi(configApiRef);
    currency = currency ?? configApi.getOptionalString(CONFIG_CURRENCY_PATH) ?? 'USD';
    locale = locale ?? configApi.getOptionalString(CONFIG_LOCALE_PATH) ?? detectLocale();
  } catch {
    currency = currency ?? 'USD';
    locale = locale ?? detectLocale();
  }
  const value = useMemo<FormattingContextValue>(() => {
    const { formatCurrency, formatCurrencyCompact, formatPercent } = createFormatters(locale!, currency!);
    return { locale: locale!, currency: currency!, formatCurrency, formatCurrencyCompact, formatPercent };
  }, [locale, currency]);
  return <FormattingContext.Provider value={value}>{children}</FormattingContext.Provider>;
};

/** @public */
export function useFormatting(): FormattingContextValue {
  const ctx = useContext(FormattingContext);
  if (!ctx) {
    const { formatCurrency, formatCurrencyCompact, formatPercent } = createFormatters('en-US', 'USD');
    return { locale: 'en-US', currency: 'USD', formatCurrency, formatCurrencyCompact, formatPercent };
  }
  return ctx;
}
