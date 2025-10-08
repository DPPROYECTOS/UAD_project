import React, { useState, useMemo } from 'react';
import { AuditItem } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../components/Icons';

interface AuditsViewProps {
  audits: AuditItem[];
  onOpenModal: (date: string, audit: AuditItem | null) => void;
}

// --- Holiday Helper Functions ---
const getNthDayOfMonth = (year: number, month: number, dayOfWeek: number, n: number): Date => {
    const d = new Date(Date.UTC(year, month, 1));
    d.setUTCDate(d.getUTCDate() + (dayOfWeek - d.getUTCDay() + 7) % 7 + (n - 1) * 7);
    return d;
};

const getMexicanHolidays = (year: number): Set<string> => {
    const holidays = new Set<string>();
    const toUTCString = (date: Date) => date.toISOString().split('T')[0];

    holidays.add(`${year}-01-01`); // Año Nuevo
    holidays.add(`${year}-05-01`); // Día del Trabajo
    holidays.add(`${year}-09-16`); // Día de la Independencia
    holidays.add(`${year}-12-25`); // Navidad
    
    holidays.add(toUTCString(getNthDayOfMonth(year, 1, 1, 1))); // Constitución: 1er lunes de Feb
    holidays.add(toUTCString(getNthDayOfMonth(year, 2, 1, 3))); // B. Juárez: 3er lunes de Mar
    holidays.add(toUTCString(getNthDayOfMonth(year, 10, 1, 3)));// Revolución: 3er lunes de Nov

    if ((year - 2024) % 6 === 0 && year >= 2024) {
        holidays.add(`${year}-10-01`); // Transmisión del Poder Ejecutivo
    }

    return holidays;
};

const toYMDString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const generateOccurrences = (
  audit: AuditItem,
  viewStart: Date,
  viewEnd: Date
): { date: Date; audit: AuditItem }[] => {
  const results: { date: Date; audit: AuditItem }[] = [];
  const startDate = new Date(audit.date + 'T00:00:00Z');

  if (audit.recurrence.type === 'none') {
    if (startDate >= viewStart && startDate <= viewEnd) {
      results.push({ date: startDate, audit });
    }
    return results;
  }

  let current = new Date(startDate.getTime());

  // Optimization: Fast-forward to the view window if start date is way in the past
  if (current < viewStart) {
      const { type, interval = 1, unit = 'days' } = audit.recurrence;
      if (type === 'weekly') {
          const diffWeeks = Math.floor((viewStart.getTime() - current.getTime()) / (1000 * 60 * 60 * 24 * 7));
          current.setUTCDate(current.getUTCDate() + Math.max(0, diffWeeks -1) * 7);
      } else if (type === 'monthly') {
           const diffMonths = (viewStart.getUTCFullYear() - current.getUTCFullYear()) * 12 + (viewStart.getUTCMonth() - current.getUTCMonth());
           current.setUTCMonth(current.getUTCMonth() + Math.max(0, diffMonths -1));
      }
  }


  while (current <= viewEnd) {
    if (current >= viewStart) {
      results.push({ date: current, audit });
    }
    
    // Safety break for unexpected loop conditions
    if (results.length > 50) break; 

    // Get the next occurrence
    const { type, interval = 1, unit = 'days' } = audit.recurrence;
    let nextDate = new Date(current.getTime());
    switch (type) {
      case 'weekly':
        nextDate.setUTCDate(nextDate.getUTCDate() + 7);
        break;
      case 'monthly':
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
        break;
      case 'custom':
        switch (unit) {
          case 'days':
            nextDate.setUTCDate(nextDate.getUTCDate() + interval);
            break;
          case 'weeks':
            nextDate.setUTCDate(nextDate.getUTCDate() + interval * 7);
            break;
          case 'months':
            nextDate.setUTCMonth(nextDate.getUTCMonth() + interval);
            break;
        }
        break;
      default:
        return results; // should not happen
    }
    
    if(nextDate.getTime() === current.getTime()){
        break; // break if date does not advance
    }
    current = nextDate;
  }
  return results;
};


const AuditsView: React.FC<AuditsViewProps> = ({ audits, onOpenModal }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  
  const calendarDays = useMemo(() => {
    const year = firstDayOfMonth.getUTCFullYear();
    const month = firstDayOfMonth.getUTCMonth();
    
    const startDate = new Date(Date.UTC(year, month, 1));
    const startingDayOfWeek = startDate.getUTCDay();
    startDate.setUTCDate(startDate.getUTCDate() - startingDayOfWeek);

    const days = [];
    for (let i = 0; i < 42; i++) { // Always render 6 weeks for consistency
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + i);
      days.push(date);
    }
    
    return days;
  }, [firstDayOfMonth]);
  
  const monthlyAudits = useMemo(() => {
    const viewStart = calendarDays[0];
    const viewEnd = calendarDays[calendarDays.length - 1];
    const occurrences = new Map<string, AuditItem[]>();

    audits.forEach(audit => {
        const auditOccurrences = generateOccurrences(audit, viewStart, viewEnd);
        auditOccurrences.forEach(({ date, audit }) => {
            const dateString = toYMDString(date);
            if (!occurrences.has(dateString)) {
                occurrences.set(dateString, []);
            }
            occurrences.get(dateString)!.push(audit);
        });
    });

    return occurrences;

  }, [audits, calendarDays]);

  const holidays = useMemo(() => {
    return getMexicanHolidays(currentDate.getFullYear());
  }, [currentDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };


  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendario de Auditorías</h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Programa, visualiza y gestiona todas tus auditorías.
          </p>
        </div>
        <button 
          onClick={() => onOpenModal(toYMDString(new Date()), null)}
          className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary w-full sm:w-auto"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Auditoría
        </button>
      </div>
      
      <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md p-4 sm:p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
             <button onClick={handleGoToToday} className="px-3 py-1.5 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg">
                Hoy
            </button>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-center capitalize">
            {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="w-24"></div> {/* Spacer to balance header */}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-light-border dark:bg-dark-border border-t border-l border-light-border dark:border-dark-border">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-bold py-2 bg-light-bg dark:bg-dark-bg/50 text-light-text-secondary dark:text-dark-text-secondary">
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            const dayOfWeek = day.getUTCDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isCurrentMonth = day.getUTCMonth() === currentDate.getUTCMonth();
            
            const dayString = toYMDString(day);
            const isToday = day.getTime() === today.getTime();
            const dayAudits = monthlyAudits.get(dayString) || [];
            const isHoliday = holidays.has(dayString);

            return (
              <div 
                key={day.toISOString()} 
                className={`relative p-2 min-h-[120px] flex flex-col cursor-pointer transition-colors hover:bg-light-bg dark:hover:bg-dark-bg 
                  ${isCurrentMonth ? 'bg-light-card dark:bg-dark-card' : 'bg-light-bg/50 dark:bg-dark-bg/20'}
                  ${isWeekend ? 'weekend-cell' : ''} 
                  ${isHoliday ? 'holiday-cell' : ''}`}
                onClick={() => onOpenModal(dayString, null)}
              >
                <div className={`flex items-center justify-center h-7 w-7 text-sm font-semibold rounded-full 
                  ${isToday ? 'bg-brand-primary text-white' : ''}
                  ${isHoliday ? 'text-red-500 dark:text-red-400' : ''}
                  ${!isCurrentMonth ? 'text-light-text-secondary/50 dark:text-dark-text-secondary/50' : ''}`}
                >
                  {day.getUTCDate()}
                </div>
                <div className="mt-1 space-y-1 overflow-y-auto flex-grow">
                    {dayAudits.map(audit => (
                        <div
                            key={audit.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenModal(dayString, audit);
                            }}
                            className={`p-1.5 text-xs font-medium rounded-md text-white truncate cursor-pointer ${audit.color || 'bg-gray-500'}`}
                            title={audit.title}
                        >
                            {audit.title}
                        </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AuditsView;
