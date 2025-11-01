import React from 'react';
/** @public */
export interface FormattingContextValue {
    locale: string;
    currency: string;
    formatCurrency: (value: number | null | undefined, opts?: {
        maximumFractionDigits?: number;
    }) => string;
    formatCurrencyCompact: (value: number | null | undefined, opts?: {
        maximumFractionDigits?: number;
    }) => string;
    formatPercent: (value: number | null | undefined, opts?: {
        fractionDigits?: number;
    }) => string;
}
export declare function createFormatters(locale: string, currency: string): {
    formatCurrency: (value: number | null | undefined, opts?: {
        maximumFractionDigits?: number | undefined;
    } | undefined) => string;
    formatCurrencyCompact: (value: number | null | undefined, opts?: {
        maximumFractionDigits?: number | undefined;
    } | undefined) => string;
    formatPercent: (value: number | null | undefined, opts?: {
        fractionDigits?: number | undefined;
    } | undefined) => string;
};
/** @public */
export declare const FormattingProvider: ({ children, currency: overrideCurrency, locale: overrideLocale, configApi: overrideConfigApi }: {
    children: React.ReactNode;
    currency?: string;
    locale?: string;
    configApi?: {
        getOptionalString(path: string): string | undefined;
    };
}) => React.JSX.Element;
/** @public */
export declare function useFormatting(): FormattingContextValue;
