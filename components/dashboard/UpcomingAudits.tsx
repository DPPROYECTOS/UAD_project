import React from 'react';
import { AuditItem } from '../../types';
import { AuditIcon } from '../Icons';

interface UpcomingAuditsProps {
  audits: AuditItem[];
}

const UpcomingAudits: React.FC<UpcomingAuditsProps> = ({ audits }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingAudit = audits
    .map(audit => {
      const parts = audit.date.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return { ...audit, dateObj };
    })
    .filter(audit => audit.dateObj >= today)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())[0];

  if (!upcomingAudit) {
    return (
      <div className="bg-light-card/50 dark:bg-dark-card/50 backdrop-blur p-6 rounded-sm border border-dashed border-light-border dark:border-dark-border text-center flex flex-col items-center justify-center h-32">
        <AuditIcon className="h-8 w-8 text-gray-400/50 mb-2" />
        <p className="text-xs font-mono uppercase text-light-text-secondary dark:text-dark-text-secondary">Sin Eventos Próximos</p>
      </div>
    );
  }

  const diffTime = upcomingAudit.dateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let daysRemainingText = '';
  if (diffDays === 0) daysRemainingText = 'HOY';
  else if (diffDays === 1) daysRemainingText = 'MAÑANA';
  else daysRemainingText = `EN ${diffDays} DÍAS`;
  
  // Mapping standard colors to Tailwind classes for the glow effect
  // We use inline styles for dynamic colors to ensure compatibility
  const auditColorClass = upcomingAudit.color || 'bg-blue-500';

  return (
    <div className={`relative p-5 rounded-sm overflow-hidden text-white shadow-lg ${auditColorClass}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
      </div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 border-b border-white/30 pb-1 mb-2">Próxima Auditoría</h3>
            <AuditIcon className="h-5 w-5 opacity-80" />
        </div>
        
        <p className="text-lg font-bold mt-1 leading-tight">{upcomingAudit.title}</p>
        
        <div className="flex justify-between items-end mt-4 pt-3 border-t border-white/20">
            <div className="flex flex-col">
                <span className="text-[10px] uppercase opacity-70">Fecha Objetivo</span>
                <span className="font-mono text-sm font-bold">
                    {upcomingAudit.dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                </span>
            </div>
            <span className="font-mono text-xl font-bold tracking-tighter animate-pulse">{daysRemainingText}</span>
        </div>
      </div>
    </div>
  );
};

export default UpcomingAudits;