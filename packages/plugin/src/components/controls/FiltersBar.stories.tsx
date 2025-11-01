import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React, { useState } from 'react';

import { FiltersBar, PeriodPreset, GroupBy } from './FiltersBar';

const meta: Meta<typeof FiltersBar> = {
  title: 'Costscope/FiltersBar',
  component: FiltersBar,
};
export default meta;

type Story = StoryObj<typeof FiltersBar>;

const StatefulWrapper = () => {
  const [period, setPeriod] = useState<PeriodPreset>('P30D');
  const [group, setGroup] = useState<GroupBy>('ServiceCategory');
  return (
    <FiltersBar
      period={period}
      group={group}
      onChangePeriod={setPeriod}
      onChangeGroup={setGroup}
    />
  );
};

export const Default: Story = {
  render: () => <StatefulWrapper />,
};
