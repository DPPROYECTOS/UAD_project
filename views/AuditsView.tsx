import React, { useState, useMemo } from 'react';
import { AuditItem, UserPermissions, User } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../components/Icons';

interface AuditsViewProps {
  audits: AuditItem[];
  onOpenModal: (date: string, audit: AuditItem | null) => void;
  userPermissions: UserPermissions | null;
  user?: User;
  deleteLocks?: Record<string, boolean>;
}

// --- Holiday Helper Functions ---
const getNthDayOfMonth = (year: number, month: number, dayOfWeek: number, n: number): Date => {
    const d = new Date(Date.UTC(year, month, 1));
    d.setUTCDate(d.getUTCDate() + (dayOfWeek - d.getUTCDay() + 7) % 7 + (n - 1) * 7);
    return d;
};

// Modified to return a Map of date -> holiday name
const getMexicanHolidays = (year: number): Map<string, string> => {
    const holidays = new Map<string, string>();
    const toUTCString = (date: Date) => date.toISOString().split('T')[0];

    holidays.set(`${year}-01-01`, "Año Nuevo");
    holidays.set(`${year}-05-01`, "Día del Trabajo");
    holidays.set(`${year}-09-16`, "Independencia");
    holidays.set(`${year}-12-25`, "Navidad");
    
    holidays.set(toUTCString(getNthDayOfMonth(year, 1, 1, 1)), "Constitución");
    holidays.set(toUTCString(getNthDayOfMonth(year, 2, 1, 3)), "Benito Juárez");
    holidays.set(toUTCString(getNthDayOfMonth(year, 10, 1, 3)), "Revolución");

    if ((year - 2024) % 6 === 0 && year >= 2024) {
        holidays.set(`${year}-10-01`, "Transmisión Poder");
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


const AuditsView: React.FC<AuditsViewProps> = ({ audits, onOpenModal, userPermissions, user, deleteLocks = {} }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const canManage = userPermissions?.auditorias?.canManage ?? false;

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

  // Calculate local today string for highlighting
  const today = new Date();
  const localTodayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">Calendario de Auditorías</h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Programa, visualiza y gestiona todas tus auditorías.
          </p>
        </div>
        {canManage && (
            <button 
                onClick={() => onOpenModal(toYMDString(new Date()), null)}
                className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary w-full sm:w-auto"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                Nueva Auditoría
            </button>
        )}
      </div>
      
      {/* Forced Dark Theme Container */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-md p-4 sm:p-6 text-gray-100">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-800 text-gray-300">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-800 text-gray-300">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
             <button onClick={handleGoToToday} className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-600 hover:bg-gray-800 text-gray-300">
                Hoy
            </button>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-center capitalize text-white">
            {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="w-24"></div> {/* Spacer to balance header */}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-800 border-t border-l border-gray-800">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-bold py-2 bg-gray-900 text-gray-400">
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            const dayOfWeek = day.getUTCDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isCurrentMonth = day.getUTCMonth() === currentDate.getUTCMonth();
            
            const dayString = toYMDString(day);
            // Use string comparison for accurate "Today" check regardless of UTC/Local time offsets
            const isToday = dayString === localTodayString;
            const dayAudits = monthlyAudits.get(dayString) || [];
            const holidayName = holidays.get(dayString);
            const isHoliday = !!holidayName;

            return (
              <div 
                key={day.toISOString()} 
                className={`relative p-2 min-h-[120px] flex flex-col transition-all
                  ${canManage ? 'cursor-pointer hover:bg-gray-800' : 'cursor-default'}
                  ${isCurrentMonth ? 'bg-gray-900' : 'bg-gray-900/50'}
                  ${isWeekend ? 'bg-gray-900/30' : ''} 
                  ${isHoliday ? 'bg-red-900/10' : ''}
                  ${isToday ? '!bg-brand-primary/10 ring-2 ring-inset ring-brand-primary shadow-[inset_0_0_15px_rgba(59,130,246,0.15)] z-10' : ''}`}
                onClick={() => canManage && onOpenModal(dayString, null)}
              >
                <div className="flex items-center justify-between">
                    <div className={`flex items-center justify-center h-7 w-7 text-sm font-semibold rounded-full 
                      ${isToday ? 'bg-brand-primary text-white' : ''}
                      ${isHoliday && !isToday ? 'text-red-400' : 'text-gray-300'}
                      ${!isCurrentMonth ? 'text-gray-600' : ''}`}
                    >
                      {day.getUTCDate()}
                    </div>
                    {isHoliday && (
                        <span className="text-[10px] font-medium text-yellow-500 uppercase tracking-wide ml-1 truncate" title={holidayName}>
                            {holidayName}
                        </span>
                    )}
                </div>

                <div className="mt-1 space-y-1 overflow-y-auto flex-grow">
                    {dayAudits.map(audit => (
                        <div
                            key={audit.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenModal(dayString, audit);
                            }}
                            className={`p-1.5 text-xs font-medium rounded-md text-white cursor-pointer ${audit.color || 'bg-gray-500'} hover:brightness-110 transition-all`}
                            title={audit.title}
                        >
                            <div className="flex justify-between items-center">
                                <span className="truncate flex-1">{audit.title}</span>
                                {audit.timeOfAudit && <span className="ml-1 flex-shrink-0 opacity-80">{audit.timeOfAudit}</span>}
                            </div>
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