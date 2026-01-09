
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

// --- New Business Day Calculation ---
const getBusinessDayEndDate = (startDate: Date, duration: number, holidays: Set<string>): Date => {
    let currentDate = new Date(startDate.getTime());
    let remainingDuration = duration;

    // The loop should continue as long as there's duration left to account for.
    // We start by checking the first day.
    while (remainingDuration > 0) {
        const dayOfWeek = currentDate.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.has(currentDate.toISOString().split('T')[0]);

        if (!isWeekend && !isHoliday) {
            remainingDuration--;
        }

        // Only advance the day if there's more duration to account for.
        // This ensures the final day is the correct end date.
        if (remainingDuration > 0) {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
    }
    return currentDate;
};

// --- Task Hierarchy Helper ---
type HierarchicalTask = ProjectTask & { level: number };

const getHierarchicalTasks = (tasks: ProjectTask[]): HierarchicalTask[] => {
    const taskMap = new Map(tasks.map(task => [task.id, { ...task, children: [] as ProjectTask[] }]));
    const rootTasks: (ProjectTask & { children: ProjectTask[] })[] = [];

    tasks.forEach(task => {
        if (task.parentId && taskMap.has(task.parentId)) {
            taskMap.get(task.parentId)?.children.push(taskMap.get(task.id)!);
        } else {
            rootTasks.push(taskMap.get(task.id)!);
        }
    });
    
    // Sort children by start date at each level
    taskMap.forEach(task => task.children.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
    rootTasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const flattened: HierarchicalTask[] = [];
    const traverse = (task: ProjectTask, level: number) => {
        flattened.push({ ...task, level });
        taskMap.get(task.id)?.children.forEach(child => traverse(child, level + 1));
    };

    rootTasks.forEach(task => traverse(task, 0));
    return flattened;
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
    
    const hierarchicalTasks = React.useMemo(() => getHierarchicalTasks(tasks), [tasks]);

    const holidays = React.useMemo(() => {
        if (!projectStartDate) return new Set<string>();
        const startYear = projectStartDate.getUTCFullYear();
        const tempEndDate = parseDate(project.endDate);
        const endYear = tempEndDate ? tempEndDate.getUTCFullYear() : startYear + 1; // Look one year ahead if no end date
        const allHolidays = new Set<string>();
        for (let year = startYear; year <= endYear; year++) {
            getMexicanHolidays(year).forEach(holiday => allHolidays.add(holiday));
        }
        return allHolidays;
    }, [project.startDate, project.endDate]);

    if (!projectStartDate) {
        return <div className="flex items-center justify-center h-full text-light-text-secondary dark:text-dark-text-secondary">La fecha de inicio del proyecto es inválida.</div>;
    }

    let chartEndDate = parseDate(project.endDate);
    if (!chartEndDate || hierarchicalTasks.length > 0) {
        const latestTaskEnd = hierarchicalTasks.reduce((latest, task) => {
            const taskStart = parseDate(task.startDate);
            if (!taskStart) return latest;
            const businessDuration = task.duration > 0 ? task.duration : 1;
            const taskEnd = getBusinessDayEndDate(taskStart, businessDuration, holidays);
            return taskEnd > latest ? taskEnd : latest;
        }, new Date(0));
        
        const defaultEndDate = addDays(projectStartDate, 29);
        const calculatedEndDate = latestTaskEnd.getTime() > 0 ? latestTaskEnd : defaultEndDate;

        if (!chartEndDate || calculatedEndDate > chartEndDate) {
            chartEndDate = calculatedEndDate;
        }
    }
    
    if (!chartEndDate || chartEndDate < projectStartDate) {
         return <div className="flex items-center justify-center h-full text-light-text-secondary dark:text-dark-text-secondary">Las fechas del proyecto son inválidas.</div>;
    }

    const totalDays = getDaysDiff(projectStartDate, chartEndDate) + 1;
    const dateHeaders: Date[] = Array.from({ length: totalDays }, (_, i) => addDays(projectStartDate, i));
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIndex = dateHeaders.findIndex(d => d.getTime() === today.getTime());

    if (hierarchicalTasks.length === 0) {
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
                {hierarchicalTasks.map((task, rowIndex) => {
                    const taskStartDate = parseDate(task.startDate);
                    if (!taskStartDate) return null;

                    const businessDuration = task.duration > 0 ? task.duration : 1;
                    const taskEndDate = getBusinessDayEndDate(taskStartDate, businessDuration, holidays);
                    
                    const { bar, dot } = taskColors[rowIndex % taskColors.length];
                    const rowBgClass = rowIndex % 2 === 0 ? 'bg-light-card dark:bg-dark-card' : 'bg-light-bg dark:bg-dark-bg/80';

                    // --- NEW: Calculate bar segments to skip non-working days ---
                    const segments: { startDate: Date; calendarDuration: number }[] = [];
                    let segmentStartDate: Date | null = null;
                    const totalCalendarDays = getDaysDiff(taskStartDate, taskEndDate);

                    for (let i = 0; i <= totalCalendarDays; i++) {
                        const currentDate = addDays(taskStartDate, i);
                        const dayOfWeek = currentDate.getUTCDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isHoliday = holidays.has(currentDate.toISOString().split('T')[0]);
                        const isWorkDay = !isWeekend && !isHoliday;

                        if (isWorkDay) {
                            if (!segmentStartDate) {
                                segmentStartDate = currentDate; // Start of a new segment
                            }
                        } else { // It's a non-work day
                            if (segmentStartDate) {
                                // End of the previous segment. The end date is the day before the current non-work day.
                                const segmentEndDate = addDays(currentDate, -1);
                                const calendarDuration = getDaysDiff(segmentStartDate, segmentEndDate) + 1;
                                segments.push({ startDate: segmentStartDate, calendarDuration });
                                segmentStartDate = null;
                            }
                        }
                    }

                    // Check if a segment was still open at the end of the loop
                    if (segmentStartDate) {
                        const calendarDuration = getDaysDiff(segmentStartDate, taskEndDate) + 1;
                        segments.push({ startDate: segmentStartDate, calendarDuration });
                    }

                    const isDone = task.status !== 'pending';

                    return (
                        <React.Fragment key={task.id}>
                            {/* Sticky Task Name Cell */}
                            <div className={`sticky left-0 z-20 p-2 truncate border-t border-l border-light-border dark:border-dark-border flex items-center ${rowBgClass} ${isDone ? 'line-through text-light-text-secondary dark:text-dark-text-secondary' : ''}`}
                                 style={{ gridRow: rowIndex + 2, height: `${ROW_HEIGHT}px`, paddingLeft: `${10 + task.level * 20}px` }}>
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
                             {/* Segmented Task Bars */}
                            {segments.map((segment, segIndex) => {
                                const offsetDays = getDaysDiff(projectStartDate, segment.startDate);
                                
                                if (offsetDays < -segment.calendarDuration || offsetDays > totalDays) return null; // Skip segments outside view
                                
                                const barStartColumn = offsetDays + 2;

                                return (
                                    <div key={segIndex} className={`flex items-center h-8 my-auto rounded text-white px-2 overflow-hidden z-10 ${bar} ${isDone ? 'opacity-40' : ''} ${task.status === 'failed' ? 'border-2 border-red-500' : ''}`}
                                         title={`${task.title} - Estado: ${task.status}`}
                                         style={{ 
                                             gridRow: rowIndex + 2, 
                                             gridColumn: `${barStartColumn} / span ${segment.calendarDuration}`,
                                             marginLeft: '4px',
                                             marginRight: '4px',
                                          }}>
                                        {/* Only show text in the first segment to avoid repetition */}
                                        {segIndex === 0 && <span className="truncate text-xs font-medium">{task.status === 'completed' ? 'Hecho' : task.status === 'failed' ? 'Fallido' : task.title}</span>}
                                    </div>
                                );
                            })}
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
