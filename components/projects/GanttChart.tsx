import React from 'react';
import { Project, ProjectTask } from '../../types';
import { ClipboardListIcon } from '../Icons';

// --- Date and Holiday Helper Functions ---
const parseDate = (dateString: string): Date | null => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
    const parts = dateString.split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
};

const getDaysDiff = (startDate: Date, endDate: Date): number => {
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
};

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

// --- Styling and Color Constants ---
const DAY_CELL_WIDTH = 48;
const TASK_NAME_WIDTH = 250;
const ROW_HEIGHT = 40;
const taskColors = [
  { bar: 'bg-blue-500', dot: 'bg-blue-500' },
  { bar: 'bg-green-500', dot: 'bg-green-500' },
  { bar: 'bg-orange-400', dot: 'bg-orange-400' },
  { bar: 'bg-purple-500', dot: 'bg-purple-500' },
  { bar: 'bg-pink-500', dot: 'bg-pink-500' },
  { bar: 'bg-teal-500', dot: 'bg-teal-500' },
];

interface GanttChartProps {
    project: Project;
    tasks: ProjectTask[];
}

const GanttChart: React.FC<GanttChartProps> = ({ project, tasks }) => {
    const projectStartDate = parseDate(project.startDate);

    if (!projectStartDate) {
        return <div className="flex items-center justify-center h-full text-light-text-secondary dark:text-dark-text-secondary">La fecha de inicio del proyecto es inválida.</div>;
    }

    let chartEndDate = parseDate(project.endDate);
    if (!chartEndDate) {
        const latestTaskEnd = tasks.reduce((latest, task) => {
            const taskStart = parseDate(task.startDate);
            if (!taskStart) return latest;
            const taskEnd = addDays(taskStart, task.duration > 0 ? task.duration - 1 : 0);
            return taskEnd > latest ? taskEnd : latest;
        }, new Date(0));
        chartEndDate = latestTaskEnd.getTime() > 0 ? latestTaskEnd : addDays(projectStartDate, 29);
    }
    
    if (!chartEndDate || chartEndDate < projectStartDate) {
         return <div className="flex items-center justify-center h-full text-light-text-secondary dark:text-dark-text-secondary">Las fechas del proyecto son inválidas.</div>;
    }

    const totalDays = getDaysDiff(projectStartDate, chartEndDate) + 1;
    const dateHeaders: Date[] = Array.from({ length: totalDays }, (_, i) => addDays(projectStartDate, i));
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIndex = dateHeaders.findIndex(d => d.getTime() === today.getTime());

    const holidays = new Set<string>();
    const startYear = projectStartDate.getUTCFullYear();
    const endYear = chartEndDate.getUTCFullYear();
    for (let year = startYear; year <= endYear; year++) {
        getMexicanHolidays(year).forEach(holiday => holidays.add(holiday));
    }

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-light-text-secondary dark:text-dark-text-secondary p-8">
                <ClipboardListIcon className="h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">No hay tareas para mostrar</h3>
                <p className="mt-1 text-sm">Añade tareas al proyecto para ver el diagrama de Gantt.</p>
            </div>
        );
    }

    return (
        <div className="relative text-sm" style={{ width: `${TASK_NAME_WIDTH + totalDays * DAY_CELL_WIDTH}px` }}>
            <div className="grid border-r border-b border-light-border dark:border-dark-border" 
                 style={{ 
                     gridTemplateColumns: `${TASK_NAME_WIDTH}px repeat(${totalDays}, ${DAY_CELL_WIDTH}px)`,
                 }}>
                {/* --- HEADER --- */}
                <div className="sticky top-0 left-0 z-30 p-2 font-semibold border-t border-l border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg flex items-center" style={{ height: `${ROW_HEIGHT * 1.5}px` }}>
                    Tarea
                </div>
                {dateHeaders.map((date, index) => {
                    const dayOfWeek = date.getUTCDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isHoliday = holidays.has(date.toISOString().split('T')[0]);
                    const headerCellClasses = `sticky top-0 z-20 text-center p-2 border-t border-l border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg flex flex-col justify-center ${isWeekend ? 'weekend-cell' : ''}`;
                    const dayTextClasses = `text-xs ${isHoliday ? 'text-red-500 dark:text-red-400 font-bold' : 'text-light-text-secondary dark:text-dark-text-secondary'}`;

                    return (
                        <div key={index} className={headerCellClasses} style={{ height: `${ROW_HEIGHT * 1.5}px` }}>
                            <div className={dayTextClasses}>{date.toLocaleDateString('es-ES', { weekday: 'narrow', timeZone: 'UTC' }).toUpperCase()}</div>
                            <div className={`font-semibold mt-1 ${isHoliday ? 'text-red-500 dark:text-red-400' : ''}`}>{date.getUTCDate()}</div>
                        </div>
                    );
                })}

                {/* --- TASK ROWS & BARS --- */}
                {tasks.map((task, rowIndex) => {
                    const taskStartDate = parseDate(task.startDate);
                    if (!taskStartDate) return null;

                    const offsetDays = getDaysDiff(projectStartDate, taskStartDate);
                    const durationDays = task.duration > 0 ? task.duration : 1;
                    
                    if (offsetDays < -durationDays || offsetDays > totalDays) return null; // Skip tasks outside view
                    
                    const barStartColumn = offsetDays + 2;
                    const { bar, dot } = taskColors[rowIndex % taskColors.length];
                    const rowBgClass = rowIndex % 2 === 0 ? 'bg-light-card dark:bg-dark-card' : 'bg-light-bg dark:bg-dark-bg/80';

                    return (
                        <React.Fragment key={task.id}>
                            {/* Sticky Task Name Cell */}
                            <div className={`sticky left-0 z-20 p-2 truncate border-t border-l border-light-border dark:border-dark-border flex items-center ${rowBgClass}`}
                                 style={{ gridRow: rowIndex + 2, height: `${ROW_HEIGHT}px` }}>
                                <span className={`h-3 w-3 rounded-full ${dot} mr-3 flex-shrink-0`}></span>
                                {task.title}
                            </div>
                            {/* Grid Background Cells */}
                            {dateHeaders.map((date, dayIndex) => {
                                const dayOfWeek = date.getUTCDay();
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                return (
                                    <div key={dayIndex} className={`border-t border-l border-light-border dark:border-dark-border ${rowBgClass} ${isWeekend ? 'weekend-cell' : ''}`}
                                         style={{ gridRow: rowIndex + 2, gridColumn: dayIndex + 2, height: `${ROW_HEIGHT}px` }}/>
                                );
                            })}
                             {/* Task Bar */}
                            <div className={`flex items-center h-8 my-auto rounded text-white px-2 overflow-hidden z-10 ${bar}`}
                                 title={`${task.title} - Inicio: ${task.startDate}, Duración: ${task.duration} días`}
                                 style={{ 
                                     gridRow: rowIndex + 2, 
                                     gridColumn: `${barStartColumn} / span ${durationDays}`,
                                     marginLeft: '4px',
                                     marginRight: '4px',
                                  }}>
                                <span className="truncate text-xs font-medium">{task.title}</span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
            {/* Today Marker Line */}
            {todayIndex !== -1 && (
                <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" 
                    style={{ 
                        left: `${TASK_NAME_WIDTH + todayIndex * DAY_CELL_WIDTH + (DAY_CELL_WIDTH / 2)}px`,
                        top: `${ROW_HEIGHT * 1.5}px`, // Start below header
                    }}
                    title={`Hoy: ${today.toLocaleDateString()}`}
                />
            )}
        </div>
    );
};

export default GanttChart;