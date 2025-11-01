import React from 'react';
export type PeriodPreset = 'P7D' | 'P30D' | 'P90D';
export type GroupBy = 'ServiceCategory' | 'RegionId';
export interface FiltersBarProps {
    period: PeriodPreset;
    group: GroupBy;
    onChangePeriod: (p: PeriodPreset) => void;
    onChangeGroup: (g: GroupBy) => void;
    disableAnalytics?: boolean;
}
export declare const FiltersBar: ({ period, group, onChangePeriod, onChangeGroup, disableAnalytics, }: FiltersBarProps) => React.JSX.Element;
