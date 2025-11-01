import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider, useI18n } from './i18n';

describe('i18n locale resolution (navigator/configApi)', () => {
  const origNavigator = (globalThis as any).navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: origNavigator, configurable: true });
  });

  it('uses navigator.languages and falls back to en when locale pack missing', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['ru-RU'], language: 'ru-RU' },
      configurable: true,
    });
    const Probe = () => {
      const { t, locale } = useI18n();
      return (
        <div>
          <span data-testid="loc">{locale}</span>
          <span data-testid="msg">{t('overview.nodata.title')}</span>
        </div>
      );
    };
    const { getByTestId } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await waitFor(() => expect(getByTestId('loc').textContent).toBe('en'));
    expect(getByTestId('msg').textContent).toBe('No data');
  });

  it('resolves locale from configApi (en) without dynamic import and merges overrides', async () => {
    const configApi = { getOptionalString: (k: string) => (k === 'costscope.locale' ? 'en' : undefined) };
    const Probe = () => {
      const { t, locale } = useI18n();
      return (
        <div>
          <span data-testid="loc">{locale}</span>
          <span data-testid="custom">{t('x.hello', { name: 'Neo' })}</span>
        </div>
      );
    };
    const { getByTestId } = render(
      <I18nProvider configApi={configApi} messages={{ 'x.hello': 'Hello {name}' }}>
        <Probe />
      </I18nProvider>,
    );
    expect(getByTestId('loc').textContent).toBe('en');
    expect(getByTestId('custom').textContent).toBe('Hello Neo');
  });

  it('handles configApi read error and falls back to en', async () => {
    const configApi = { getOptionalString: (_: string) => { throw new Error('boom'); } };
    const Probe = () => {
      const { t, locale } = useI18n();
      return (
        <div>
          <span data-testid="loc">{locale}</span>
          <span data-testid="msg">{t('overview.retry')}</span>
        </div>
      );
    };
    const { getByTestId } = render(
      <I18nProvider configApi={configApi}>
        <Probe />
      </I18nProvider>,
    );
    await waitFor(() => expect(getByTestId('loc').textContent).toBe('en'));
    expect(getByTestId('msg').textContent).toBe('Retry');
  });
});
