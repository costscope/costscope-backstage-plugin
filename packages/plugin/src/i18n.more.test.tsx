import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider, useI18n } from './i18n';

describe('i18n additional coverage', () => {
  it('useI18n without provider falls back to en: returns key and interpolates', () => {
    const Probe = () => {
      const { t, locale } = useI18n();
      return (
        <div>
          <span data-testid="loc">{locale}</span>
          <span data-testid="k1">{t('missing.key')}</span>
          <span data-testid="k2">{t('overview.error.title')}</span>
          <span data-testid="interp-missing">{t('custom.hello', /* no vars */ undefined)}</span>
        </div>
      );
    };
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('loc').textContent).toBe('en');
    expect(getByTestId('k1').textContent).toBe('missing.key');
    // Known key from bundled en messages
    expect(getByTestId('k2').textContent).toBe('Error');
    // No template exists for custom.hello so key is returned
    expect(getByTestId('interp-missing').textContent).toBe('custom.hello');
  });

  it('unknown/stub locale merges explicit overrides; built-ins still from en when pack empty', async () => {
    const Probe = () => {
      const { t, locale } = useI18n();
      return (
        <div>
          <span data-testid="loc">{locale}</span>
          <span data-testid="built-in">{t('overview.retry')}</span>
          <span data-testid="override">{t('custom.greeting', { name: 'Lin' })}</span>
        </div>
      );
    };
    const { getByTestId } = render(
      <I18nProvider locale="xx" messages={{ 'custom.greeting': 'Hi {name}' }}>
        <Probe />
      </I18nProvider>,
    );
    // With an empty xx pack, the active locale can remain 'xx' but built-ins resolve from en fallback
    await waitFor(() => expect(getByTestId('loc').textContent).toBe('xx'));
    // Built-in string should be from en bundle
    expect(getByTestId('built-in').textContent).toBe('Retry');
    // Explicit overrides should be merged/applied
    expect(getByTestId('override').textContent).toBe('Hi Lin');
  });

  it('preserves placeholders when vars are missing', () => {
    const Probe = () => {
      const { t } = useI18n();
      return <span data-testid="out">{t('welcome.message')}</span>;
    };
    const { getByTestId } = render(
      <I18nProvider locale="en" messages={{ 'welcome.message': 'Hello {name}' }}>
        <Probe />
      </I18nProvider>,
    );
    // Without providing vars, placeholder remains
    expect(getByTestId('out').textContent).toBe('Hello {name}');
  });
});
