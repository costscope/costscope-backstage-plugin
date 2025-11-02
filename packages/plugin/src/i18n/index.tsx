import React from 'react';

import en from '../locales/en/messages.json';

// Basic messages map keyed by locale code. Extendable later.
const MESSAGES: Record<string, Record<string, string>> = { en } as const;

/** @public */
export interface I18nContextValue {
  t: (key: string, vars?: Record<string, any>) => string;
  locale: string;
  messages: Record<string, string>;
}

/** @public */
export const I18nContext = React.createContext<I18nContextValue | undefined>(undefined);

/** @public */
export const I18nProvider = ({ locale: forcedLocale, messages, children, configApi }: { locale?: string; messages?: Record<string, string>; children: React.ReactNode; configApi?: { getOptionalString(key: string): string | undefined } }) => {
  // Resolve desired locale precedence: explicit prop > configApi > navigator > 'en'
  const detectedNavigator = ((): string | undefined => {
    try {
      const nav: any = (globalThis as any).navigator;
      if (nav?.languages && nav.languages.length) return String(nav.languages[0]).split('-')[0];
      if (nav?.language) return String(nav.language).split('-')[0];
    } catch {/* ignore */}
    return undefined;
  })();
  const configLocale = (() => {
    try { return configApi?.getOptionalString?.('costscope.locale'); } catch { return undefined; }
  })();
  const desired = (forcedLocale || configLocale || detectedNavigator || 'en').toLowerCase();
  const [activeLocale, setActiveLocale] = React.useState<string>(desired);
  const [extraMessages, setExtraMessages] = React.useState<Record<string,string>|undefined>(messages);

  // Lazy dynamic import for non-en locales (anticipating future locale files)
  React.useEffect(() => {
    let mounted = true;
    if (desired === 'en') {
      setActiveLocale('en');
      setExtraMessages(messages); // just apply overrides
      return () => { mounted = false; };
    }
    (async () => {
      try {
        const mod = await import(/* webpackChunkName: "i18n-[request]" */ `../locales/${desired}/messages.json`).catch(() => undefined);
        if (mounted) {
          if (mod && typeof mod === 'object') {
            (MESSAGES as any)[desired] = { ...(MESSAGES as any)[desired], ...(mod as any).default || mod };
            setActiveLocale(desired);
          } else {
            setActiveLocale('en');
          }
          setExtraMessages(messages);
        }
      } catch {
        if (mounted) {
          setActiveLocale('en');
          setExtraMessages(messages);
        }
      }
    })();
    return () => { mounted = false; };
  }, [desired, messages]);

  const base = (activeLocale && (MESSAGES as any)[activeLocale]) || MESSAGES.en;
  const merged = React.useMemo(() => ({ ...base, ...(extraMessages || {}) }), [base, extraMessages]);

  const t = React.useCallback((key: string, vars?: Record<string, any>) => {
    let template = merged[key];
    if (!template) {
      // Fallback: return the key itself (visible for missing translations) – test covers this.
      return key;
    }
    if (vars) {
      // Simple variable interpolation {var}
      template = template.replace(/\{(\w+)\}/g, (_match: string, name: string) => (vars[name] !== undefined ? String(vars[name]) : `{${name}}`));
    }
    return template;
  }, [merged]);

  const value = React.useMemo(() => ({ t, locale: activeLocale, messages: merged }), [t, activeLocale, merged]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/** @public */
export const useI18n = () => {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    const fallbackMessages = MESSAGES.en;
    return {
      t: (k: string, vars?: Record<string, any>) => {
        let template = fallbackMessages[k];
        if (!template) return k;
        if (vars) template = template.replace(/\{(\w+)\}/g, (_: any, name: string) => (vars[name] !== undefined ? String(vars[name]) : `{${name}}`));
        return template;
      },
      locale: 'en',
      messages: fallbackMessages,
    } as I18nContextValue;
  }
  return ctx;
};
