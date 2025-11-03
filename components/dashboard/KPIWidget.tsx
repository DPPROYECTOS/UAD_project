import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '../Icons';

interface KPIWidgetProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
}

const KPIWidget: React.FC<KPIWidgetProps> = ({ title, value, trend }) => {
  const trendIcon =
    trend === 'up' ? (
      <ArrowUpIcon className="h-5 w-5 text-green-500" />
    ) : trend === 'down' ? (
      <ArrowDownIcon className="h-5 w-5 text-red-500" />
    ) : null;

  return (
    <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border flex flex-col justify-between h-full">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">{title}</h3>
        {trendIcon}
      </div>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
};

export default KPIWidget;