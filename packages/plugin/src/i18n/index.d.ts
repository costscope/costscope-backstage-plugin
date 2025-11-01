import React from 'react';
export interface I18nContextValue {
    t: (key: string, vars?: Record<string, any>) => string;
    locale: string;
    messages: Record<string, string>;
}
export declare const I18nContext: React.Context<I18nContextValue | undefined>;
export declare const I18nProvider: ({ locale: forcedLocale, messages, children, configApi }: {
    locale?: string;
    messages?: Record<string, string>;
    children: React.ReactNode;
    configApi?: {
        getOptionalString(key: string): string | undefined;
    };
}) => React.JSX.Element;
export declare const useI18n: () => I18nContextValue;
