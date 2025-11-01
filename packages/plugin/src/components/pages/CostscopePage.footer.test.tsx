/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CostscopePage } from './CostscopePage';
import { I18nProvider } from '../../i18n';

describe('CostscopePage footer', () => {
  it('shows current year and key links', () => {
    const year = 2025;
    const RealDate = Date;
    (global as any).Date = class extends RealDate {
      constructor() {
        super();
        return new RealDate(year, 0, 1) as any;
      }
      static now() {
        return new RealDate(year, 0, 1).getTime();
      }
      static UTC = RealDate.UTC;
      static parse = RealDate.parse;
    } as unknown as DateConstructor;

    render(
      <I18nProvider>
        <CostscopePage />
      </I18nProvider>,
    );

    expect(screen.getByTestId('costscope-footer')).toHaveTextContent(`© ${year} CostScope`);
  const pluginLinks = screen.getAllByRole('link', { name: 'Plugin' });
    const hrefs = pluginLinks.map((l) => (l as HTMLAnchorElement).getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        'https://github.com/costscope/costscope-backstage-plugin',
        'https://github.com/rulehub/rulehub-backstage-plugin',
      ]),
    );
    expect(screen.getByRole('link', { name: 'RuleHub' })).toHaveAttribute(
      'href',
      'https://github.com/rulehub',
    );
    expect(screen.getByRole('link', { name: 'CostScope' })).toHaveAttribute(
      'href',
      'https://github.com/costscope',
    );

    (global as any).Date = RealDate;
  });
});
