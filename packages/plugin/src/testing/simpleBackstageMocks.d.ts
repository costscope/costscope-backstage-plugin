import React from 'react';
export declare const SimpleTable: ({ columns, data, ...rest }: any) => React.JSX.Element;
export declare const SimpleInfoCard: ({ title, children, ...rest }: any) => React.JSX.Element;
export declare const mockCoreComponents: (overrides?: Record<string, any>) => {
    Table: ({ columns, data, ...rest }: any) => React.JSX.Element;
    InfoCard: ({ title, children, ...rest }: any) => React.JSX.Element;
};
