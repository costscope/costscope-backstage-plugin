import React from 'react';

// Simple semantic table used in axe tests to avoid heavy material-table overhead
export const SimpleTable = ({ columns, data, ...rest }: any) => (
  <table {...rest}>
    <thead>
      <tr>
        {columns.map((c: any) => (
          <th key={c.field || c.title}>{c.title}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((r: any, i: number) => (
        <tr key={i}>
          {columns.map((c: any) => (
            <td key={c.field}>{c.render ? c.render(r) : (r as any)[c.field]}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export const SimpleInfoCard = ({ title, children, ...rest }: any) => (
  <section aria-label={title} {...rest}>
    <h3>{title}</h3>
    {children}
  </section>
);

// Factory used inside jest.mock to compose overrides (Page/Header/etc.)
export const mockCoreComponents = (overrides: Record<string, any> = {}) => ({
  Table: SimpleTable,
  InfoCard: SimpleInfoCard,
  ...overrides,
});
