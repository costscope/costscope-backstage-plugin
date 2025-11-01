import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider, useI18n } from './i18n';

describe('i18n fallback', () => {
  it('returns key when missing translation', () => {
    const Probe = () => {
      const { t } = useI18n();
      return <span data-testid="out">{t('missing.key.example')}</span>;
    };
    const { getByTestId } = render(
      <I18nProvider locale="en" messages={{}}>
        <Probe />
      </I18nProvider>
    );
    expect(getByTestId('out').textContent).toBe('missing.key.example');
  });

  it('interpolates variables', () => {
    const Probe = () => {
      const { t } = useI18n();
      return <span data-testid="out">{t('custom.greeting', { name: 'Ada' })}</span>;
    };
    const { getByTestId } = render(
      <I18nProvider locale="en" messages={{ 'custom.greeting': 'Hello {name}' }}>
        <Probe />
      </I18nProvider>
    );
    expect(getByTestId('out').textContent).toBe('Hello Ada');
  });
});
