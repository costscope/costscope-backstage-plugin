import React from 'react';
export const ResponseErrorPanel = ({ error }: { error: Error }) => <div data-mock="error">{error.message}</div>;
export const Table = ({ data }: { data: any[] }) => (
  <table data-mock="table">
    <tbody>
      {data.map((r, i) => (
        <tr key={i}><td>{r.dim || r.date || 'row'}</td><td>{r.cost ?? ''}</td></tr>
      ))}
    </tbody>
  </table>
);
export const MarkdownContent = ({ content }: { content: string }) => <div data-mock="md">{content}</div>;
export const InfoCard = ({ title, children }: { title: string; children?: any }) => (
  <div data-mock="infocard">
    <strong>{title}</strong>
    <div>{children}</div>
  </div>
);
