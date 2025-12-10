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
      <ArrowUpIcon className="h-4 w-4 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
    ) : trend === 'down' ? (
      <ArrowDownIcon className="h-4 w-4 text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]" />
    ) : null;

  return (
    <div className="group relative bg-light-card/60 dark:bg-dark-card/60 backdrop-blur-md p-5 rounded-sm border border-light-border/50 dark:border-dark-border/50 hover:border-brand-primary/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(var(--color-brand-primary),0.15)] overflow-hidden">
      {/* Tech Corner Accent */}
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-primary/30 group-hover:border-brand-primary transition-colors"></div>
      
      {/* Background Grid Decoration */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, currentColor 25%, currentColor 26%, transparent 27%, transparent 74%, currentColor 75%, currentColor 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, currentColor 25%, currentColor 26%, transparent 27%, transparent 74%, currentColor 75%, currentColor 76%, transparent 77%, transparent)', backgroundSize: '20px 20px' }}>
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <h3 className="text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">{title}</h3>
          {trendIcon}
        </div>
        <div className="mt-3">
            <p className="text-3xl font-mono font-bold text-light-text dark:text-dark-text drop-shadow-sm group-hover:text-brand-primary transition-colors duration-300">
                {value}
            </p>
        </div>
      </div>
      
      {/* Scanning Line Animation on Hover */}
      <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-brand-primary/10 to-transparent skew-x-12 group-hover:animate-[shine_1s_ease-in-out] pointer-events-none"></div>
      <style>{`
        @keyframes shine {
            100% { left: 200%; }
        }
      `}</style>
    </div>
  );
};

export default KPIWidget;