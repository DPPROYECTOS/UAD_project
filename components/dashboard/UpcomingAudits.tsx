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
      // Correctly parse the date string as local time to avoid timezone issues.
      // YYYY-MM-DD strings are often parsed as UTC midnight, which can cause off-by-one errors.
      const parts = audit.date.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return { ...audit, dateObj };
    })
    .filter(audit => audit.dateObj >= today)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())[0];

  if (!upcomingAudit) {
    return (
      <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border text-center">
        <AuditIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">No hay auditorías futuras programadas.</p>
      </div>
    );
  }

  const diffTime = upcomingAudit.dateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let daysRemainingText = '';
  if (diffDays === 0) {
    daysRemainingText = 'Hoy';
  } else if (diffDays === 1) {
    daysRemainingText = 'Mañana';
  } else {
    daysRemainingText = `en ${diffDays} días`;
  }
  
  const auditColor = upcomingAudit.color || 'bg-blue-500';

  return (
    <div className={`p-4 rounded-lg text-white ${auditColor}`}>
      <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider">Próxima Auditoría</h3>
      <p className="text-lg font-semibold mt-2">{upcomingAudit.title}</p>
      <div className="flex justify-between items-baseline mt-2 text-sm">
        <span>{upcomingAudit.dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <span className="font-bold">{daysRemainingText}</span>
      </div>
    </div>
  );
};

export default UpcomingAudits;