
import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, HeadingLevel, TableLayoutType, BorderStyle, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ViewGridIcon, InformationCircleIcon, PrinterIcon, DownloadIcon, CogIcon, EyeIcon, XIcon, DocumentTextIcon } from '../components/Icons';

interface Holiday {
    date: string;
    name: string;
    isNonWorking: boolean;
}

const CalendarView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'year' | 'month'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingWord, setIsGeneratingWord] = useState(false);
    const [customHeader, setCustomHeader] = useState('Documento Oficial de Programación / Proyectos y Mejora');
    const [customFooter, setCustomFooter] = useState('');
    const [customMargin, setCustomMargin] = useState(0.4);
    const [customLogo, setCustomLogo] = useState<string | null>(null);
    const [headerFontSize, setHeaderFontSize] = useState(24);
    const [logoHeight, setLogoHeight] = useState(56);
    const [showSettings, setShowSettings] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const previewPaperRef = useRef<HTMLDivElement>(null);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const mexicanHolidays = useMemo(() => {
        const holidays: Holiday[] = [
            { date: `${year}-01-01`, name: 'Año Nuevo', isNonWorking: true },
            { date: `${year}-05-01`, name: 'Día del Trabajo', isNonWorking: true },
            { date: `${year}-09-16`, name: 'Día de la Independencia', isNonWorking: true },
            { date: `${year}-12-25`, name: 'Navidad', isNonWorking: true },
        ];

        // Feb: Constitution Day (1st Monday of Feb)
        const feb1 = new Date(year, 1, 1);
        const constitutionDay = new Date(year, 1, 1 + ((8 - feb1.getDay()) % 7));
        holidays.push({ date: constitutionDay.toISOString().split('T')[0], name: 'Día de la Constitución', isNonWorking: true });

        // Mar: Benito Juarez Birth (3rd Monday of Mar)
        const mar1 = new Date(year, 2, 1);
        const benitoJuarez = new Date(year, 2, 1 + ((8 - mar1.getDay()) % 7) + 14);
        holidays.push({ date: benitoJuarez.toISOString().split('T')[0], name: 'Natalicio de Benito Juárez', isNonWorking: true });

        // Nov: Revolution Day (3rd Monday of Nov)
        const nov1 = new Date(year, 10, 1);
        const revolutionDay = new Date(year, 10, 1 + ((8 - nov1.getDay()) % 7) + 14);
        holidays.push({ date: revolutionDay.toISOString().split('T')[0], name: 'Día de la Revolución', isNonWorking: true });

        return holidays;
    }, [year]);

    const isHoliday = (d: number, m: number, y: number) => {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return mexicanHolidays.find(h => h.date === dateStr);
    };

    const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const changeYear = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setFullYear(newDate.getFullYear() + offset);
        setCurrentDate(newDate);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDownloadPDF = async () => {
        const targetElement = isPreviewMode ? previewPaperRef.current : calendarRef.current;
        if (!targetElement) return;
        setIsGenerating(true);

        try {
            // US Letter Landscape: 11 x 8.5 inches
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'in',
                format: 'letter'
            });

            const margin = parseFloat(customMargin.toString()) || 0.4;
            const contentWidth = 11 - (margin * 2);

            const canvas = await html2canvas(targetElement, {
                scale: 3, // Even higher resolution for perfect match
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    // Only apply overrides if we are NOT capturing from the preview modal
                    // as the preview modal already looks exactly like the desired output.
                    if (!isPreviewMode) {
                        const el = clonedDoc.querySelector('[data-calendar-root]') as HTMLElement;
                        if (el) {
                            el.style.width = '1056px'; 
                            el.style.padding = '40px';
                            el.style.backgroundColor = 'white';
                            el.style.color = 'black';
                            
                            const pdfOnlyHeaders = clonedDoc.querySelectorAll('.pdf-only');
                            pdfOnlyHeaders.forEach(h => {
                                if (h instanceof HTMLElement) {
                                    h.style.display = 'flex';
                                    h.classList.remove('hidden');
                                }
                            });

                            const noPrint = clonedDoc.querySelectorAll('[data-no-print]');
                            noPrint.forEach(n => {
                                if (n instanceof HTMLElement) n.style.display = 'none';
                            });

                            const cells = clonedDoc.querySelectorAll('[data-day-cell]');
                            cells.forEach(c => {
                                if (c instanceof HTMLElement) {
                                    c.style.backgroundColor = 'white';
                                    c.style.border = '1px solid #9ca3af';
                                    if (viewMode === 'month') {
                                        c.style.height = '180px';
                                    } else {
                                        c.style.height = '60px';
                                    }
                                }
                            });
                        }
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            
            if (isPreviewMode) {
                // If capturing from preview modal, the image already contains the margins as space
                pdf.addImage(imgData, 'PNG', 0, 0, 11, 8.5);
            } else {
                pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, 8.5 - (margin * 2));
            }
            
            const fileName = viewMode === 'month' ? 
                `Calendario_${monthNames[month]}_${year}.pdf` : 
                `Calendario_Anual_${year}.pdf`;
            
            pdf.save(fileName);
        } catch (error) {
            console.warn('Error generating PDF:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadWord = async () => {
        setIsGeneratingWord(true);
        try {
            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            size: {
                                orientation: 'landscape',
                                width: 15840, // 11 inches in twentieths of a point
                                height: 12240, // 8.5 inches
                            },
                            margin: {
                                top: customMargin * 1440,
                                right: customMargin * 1440,
                                bottom: customMargin * 1440,
                                left: customMargin * 1440,
                            },
                        },
                    },
                    children: [
                        ...(() => {
                            if (!customLogo) return [];
                            try {
                                const base64Data = customLogo.split(',')[1];
                                const binaryData = atob(base64Data);
                                const uint8Array = new Uint8Array(binaryData.length);
                                for (let i = 0; i < binaryData.length; i++) {
                                    uint8Array[i] = binaryData.charCodeAt(i);
                                }
                                return [
                                    new Paragraph({
                                        children: [
                                            new ImageRun({
                                                data: uint8Array,
                                                transformation: {
                                                    width: (logoHeight * 1.6),
                                                    height: logoHeight,
                                                },
                                            } as any),
                                        ],
                                        spacing: { after: 200 },
                                    })
                                ];
                            } catch (e) {
                                console.error('Error processing logo for Word:', e);
                                return [];
                            }
                        })(),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: viewMode === 'month' ? `Calendario ${monthNames[month]} ${year}` : `Calendario Anual ${year}`,
                                    bold: true,
                                    size: headerFontSize * 2,
                                    allCaps: true,
                                }),
                            ],
                            spacing: { after: 200 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: customHeader,
                                    italics: true,
                                    size: 20,
                                }),
                            ],
                            spacing: { after: 400 },
                        }),
                        // Main Table
                        ...(viewMode === 'month' ? [
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows: [
                                    new TableRow({
                                        children: dayNames.map(day => new TableCell({
                                            children: [new Paragraph({ text: day, alignment: AlignmentType.CENTER })],
                                            shading: { fill: "F9FAFB" },
                                        })),
                                    }),
                                    ...(() => {
                                        const rows = [];
                                        const totalDays = getDaysInMonth(month, year);
                                        const firstDay = getFirstDayOfMonth(month, year);
                                        let currentDay = 1;
                                        
                                        for (let r = 0; r < 6; r++) {
                                            const cells = [];
                                            for (let c = 0; c < 7; c++) {
                                                if ((r === 0 && c < firstDay) || currentDay > totalDays) {
                                                    cells.push(new TableCell({ children: [], shading: { fill: "F9FAFB" } }));
                                                } else {
                                                    const holiday = isHoliday(currentDay, month, year);
                                                    cells.push(new TableCell({
                                                        children: [
                                                            new Paragraph({
                                                                children: [
                                                                    new TextRun({
                                                                        text: currentDay.toString(),
                                                                        bold: true,
                                                                        size: 24,
                                                                        color: holiday ? "DC2626" : "000000",
                                                                    }),
                                                                ],
                                                            }),
                                                            ...(holiday && holiday.isNonWorking ? [
                                                                new Paragraph({
                                                                    children: [
                                                                        new TextRun({
                                                                            text: holiday.name,
                                                                            size: 14,
                                                                            color: "EF4444",
                                                                            bold: true,
                                                                        }),
                                                                    ],
                                                                    alignment: AlignmentType.RIGHT,
                                                                })
                                                            ] : []),
                                                            new Paragraph({ text: "", spacing: { after: 1200 } }), // Space for notes
                                                        ],
                                                    }));
                                                    currentDay++;
                                                }
                                            }
                                            rows.push(new TableRow({ children: cells }));
                                            if (currentDay > totalDays && r > 3) break;
                                        }
                                        return rows;
                                    })(),
                                ],
                            })
                        ] : monthNames.flatMap((mName, mIndex) => {
                            const totalDays = getDaysInMonth(mIndex, year);
                            const firstDay = getFirstDayOfMonth(mIndex, year);
                            let currentDay = 1;
                            
                            return [
                                new Paragraph({
                                    children: [new TextRun({ text: mName, bold: true, size: 24, allCaps: true })],
                                    spacing: { before: 200, after: 100 },
                                }),
                                new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    rows: [
                                        new TableRow({
                                            children: dayNames.map(d => new TableCell({
                                                children: [new Paragraph({ 
                                                    children: [new TextRun({ text: d[0], size: 16 })],
                                                    alignment: AlignmentType.CENTER 
                                                })],
                                            }))
                                        }),
                                        ...(() => {
                                            const rows = [];
                                            for (let r = 0; r < 6; r++) {
                                                const cells = [];
                                                for (let c = 0; c < 7; c++) {
                                                    if ((r === 0 && c < firstDay) || currentDay > totalDays) {
                                                        cells.push(new TableCell({ children: [] }));
                                                    } else {
                                                        const holiday = isHoliday(currentDay, mIndex, year);
                                                        cells.push(new TableCell({
                                                            children: [
                                                                new Paragraph({
                                                                    children: [
                                                                        new TextRun({
                                                                            text: currentDay.toString(),
                                                                            color: holiday ? "EF4444" : "000000",
                                                                            bold: !!holiday,
                                                                            size: 18,
                                                                        })
                                                                    ],
                                                                    alignment: AlignmentType.CENTER,
                                                                })
                                                            ],
                                                        }));
                                                        currentDay++;
                                                    }
                                                }
                                                rows.push(new TableRow({ children: cells }));
                                                if (currentDay > totalDays) break;
                                            }
                                            return rows;
                                        })()
                                    ]
                                }),
                                new Paragraph({ text: "", spacing: { after: 200 } })
                            ];
                        })),
                        new Paragraph({ text: "", spacing: { before: 400 } }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: customFooter,
                                    size: 18,
                                    allCaps: true,
                                }),
                            ],
                        }),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            const fileName = viewMode === 'month' ? 
                `Calendario_${monthNames[month]}_${year}.docx` : 
                `Calendario_Anual_${year}.docx`;
            saveAs(blob, fileName);
        } catch (error) {
            console.error('Error generating Word document:', error);
        } finally {
            setIsGeneratingWord(false);
        }
    };

    const renderMonthGrid = (targetMonth: number, targetYear: number, isMini = false) => {
        const totalDays = getDaysInMonth(targetMonth, targetYear);
        const firstDay = getFirstDayOfMonth(targetMonth, targetYear);
        const days = [];

        // Padding for empty days
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={`w-full ${isMini ? 'h-6' : 'min-h-[80px] md:min-h-[120px] bg-gray-50/30 dark:bg-white/2 border border-gray-100 dark:border-white/5'}`}></div>);
        }

        for (let d = 1; d <= totalDays; d++) {
            const holiday = isHoliday(d, targetMonth, targetYear);
            const isToday = new Date().toDateString() === new Date(targetYear, targetMonth, d).toDateString();

            days.push(
                <div 
                    key={d} 
                    data-day-cell
                    className={`
                        relative flex flex-col transition-all duration-200 border border-gray-100 dark:border-white/5
                        ${isMini ? 'h-8 md:h-10 text-[10px] items-center justify-center' : 'min-h-[100px] md:min-h-[140px] p-2'}
                        ${isToday ? 'bg-brand-primary/5 dark:bg-brand-primary/10 ring-1 ring-inset ring-brand-primary' : 'bg-white dark:bg-transparent'}
                        ${holiday ? 'bg-red-50 dark:bg-red-900/10' : ''}
                    `}
                >
                    <div className="flex justify-between items-start w-full">
                        <span className={`
                            font-bold text-sm md:text-lg
                            ${isToday ? 'text-brand-primary' : 'text-gray-900 dark:text-gray-100'}
                            ${holiday ? 'text-red-600 dark:text-red-400' : ''}
                        `}>
                            {d}
                        </span>
                        {!isMini && holiday && holiday.isNonWorking && (
                             <span className="text-[7px] md:text-[9px] text-right text-red-500 font-bold uppercase max-w-[70%] leading-tight">
                                {holiday.name}
                             </span>
                        )}
                    </div>
                    
                    {!isMini && (
                        <div className="mt-auto flex flex-col gap-1">
                            {holiday && !holiday.isNonWorking && (
                                <div className="w-full">
                                    <p className="text-[10px] text-red-600 dark:text-red-400 font-bold leading-tight truncate">
                                        {holiday.name}
                                    </p>
                                </div>
                            )}
                            {holiday && holiday.isNonWorking && (
                                 <p className="text-[8px] text-red-400 opacity-80 uppercase font-mono">No Laborable</p>
                            )}
                            {/* Empty space for annotations when printed */}
                            <div className="h-full flex-grow opacity-0 group-hover:opacity-100 text-[9px] text-gray-400 italic">
                                .
                            </div>
                        </div>
                    )}
                    
                    {holiday && isMini && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                </div>
            );
        }

        return days;
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            {/* Header Control */}
            <div data-no-print className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center">
                    <div className="p-2 bg-brand-primary/10 rounded-xl mr-4">
                        <CalendarIcon className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Calendario Institucional</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">Generación y Descarga (Tamaño Carta)</p>
                    </div>
                </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2.5 rounded-xl border transition-all ${showSettings ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-gray-100 dark:bg-white/5 border-transparent text-gray-500'}`}
                            title="Personalizar PDF"
                        >
                            <CogIcon className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={() => setIsPreviewMode(true)}
                            className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-500 hover:text-brand-primary transition-all shadow-sm border border-transparent hover:border-brand-primary/30"
                            title="Vista Previa de Impresión"
                        >
                            <EyeIcon className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                            <button 
                                onClick={() => setViewMode('month')}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'month' ? 'bg-white dark:bg-brand-primary text-brand-primary dark:text-white shadow-sm' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-white/10'}`}
                            >
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                MES POR MES
                            </button>
                            <button 
                                onClick={() => setViewMode('year')}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'year' ? 'bg-white dark:bg-brand-primary text-brand-primary dark:text-white shadow-sm' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-white/10'}`}
                            >
                                <ViewGridIcon className="w-4 h-4 mr-2" />
                                VISTA ANUAL
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleDownloadPDF}
                                disabled={isGenerating || isGeneratingWord}
                                className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-[10px] tracking-wide"
                            >
                                {isGenerating ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <DownloadIcon className="w-4 h-4" />
                                )}
                                PDF
                            </button>
                            <button 
                                onClick={handleDownloadWord}
                                disabled={isGenerating || isGeneratingWord}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-[10px] tracking-wide"
                            >
                                {isGeneratingWord ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <DocumentTextIcon className="w-4 h-4" />
                                )}
                                WORD
                            </button>
                        </div>
                    </div>
            </div>

            {/* Customization Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-6"
                    >
                        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-widest">Personalización del Calendario Impreso</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Texto de Encabezado</label>
                                    <input 
                                        type="text" 
                                        value={customHeader}
                                        onChange={(e) => setCustomHeader(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary transition-all outline-none"
                                        placeholder="Ej: Proyectos 2026"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Texto de Pie de Página</label>
                                    <textarea 
                                        rows={1}
                                        value={customFooter}
                                        onChange={(e) => setCustomFooter(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary transition-all outline-none resize-none"
                                        placeholder="Ej: Documento controlado..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Margen de Página (pulgadas)</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        min="0"
                                        max="2"
                                        value={customMargin}
                                        onChange={(e) => setCustomMargin(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Tamaño del Encabezado</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <span className="text-[9px] text-gray-400 block mb-1">Texto (px)</span>
                                            <input 
                                                type="number" 
                                                value={headerFontSize}
                                                onChange={(e) => setHeaderFontSize(parseInt(e.target.value) || 12)}
                                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary transition-all outline-none"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[9px] text-gray-400 block mb-1">Logo (px)</span>
                                            <input 
                                                type="number" 
                                                value={logoHeight}
                                                onChange={(e) => setLogoHeight(parseInt(e.target.value) || 20)}
                                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Cargar Logo / Imagen (PNG)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="file" 
                                            accept="image/png"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                            id="logo-upload"
                                        />
                                        <label 
                                            htmlFor="logo-upload"
                                            className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-bold uppercase cursor-pointer hover:bg-brand-primary/20 transition-all border border-brand-primary/30"
                                        >
                                            Seleccionar archivo
                                        </label>
                                        {customLogo && (
                                            <button 
                                                onClick={() => setCustomLogo(null)}
                                                className="text-xs text-red-500 font-bold uppercase"
                                            >
                                                Eliminar Logo
                                            </button>
                                        )}
                                        {customLogo && <img src={customLogo} alt="Logo" className="h-10 w-auto object-contain bg-white p-1 rounded border border-gray-200" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Controls (No Print Context) */}
            <div data-no-print className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => viewMode === 'month' ? changeMonth(-1) : changeYear(-1)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 transition-colors"
                    >
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 min-w-[170px] text-center uppercase tracking-widest">
                        {viewMode === 'month' ? `${monthNames[month]} ${year}` : year}
                    </h2>
                    <button 
                        onClick={() => viewMode === 'month' ? changeMonth(1) : changeYear(1)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 transition-colors"
                    >
                        <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                    <InformationCircleIcon className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">Planilla optimizada para anotaciones manuales y tamaño carta en horizontal.</span>
                </div>
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {isPreviewMode && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-6xl h-full flex flex-col rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-primary/10 rounded-lg">
                                        <EyeIcon className="w-5 h-5 text-brand-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 uppercase text-sm tracking-widest leading-none">Vista Previa de Impresión</h3>
                                        <p className="text-[10px] text-gray-500 font-medium uppercase mt-1">Simulación de papel tamaño carta (Horizontal)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handleDownloadPDF}
                                        disabled={isGenerating || isGeneratingWord}
                                        className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-bold uppercase transition-all hover:bg-brand-primary/90"
                                    >
                                        <DownloadIcon className="w-4 h-4" />
                                        PDF
                                    </button>
                                    <button 
                                        onClick={handleDownloadWord}
                                        disabled={isGenerating || isGeneratingWord}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase transition-all hover:bg-blue-700"
                                    >
                                        <DocumentTextIcon className="w-4 h-4" />
                                        WORD
                                    </button>
                                    <button 
                                        onClick={() => setIsPreviewMode(false)}
                                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                    >
                                        <XIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-auto bg-gray-200/50 p-12">
                                {/* The Preview Paper Sheet */}
                                <div 
                                    ref={previewPaperRef}
                                    className="bg-white shadow-2xl mx-auto w-[1056px] h-[816px] ring-1 ring-gray-300 relative overflow-hidden flex flex-col" 
                                    style={{ padding: `${customMargin}in` }}
                                >
                                    {/* Copy of the print view logic but active */}
                                    <div className="flex items-center justify-between border-b-2 border-brand-primary pb-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            {customLogo && <img src={customLogo} alt="Logo" className="w-auto object-contain" style={{ height: `${logoHeight}px` }} />}
                                            <div>
                                                <h1 className="font-black text-gray-900 uppercase" style={{ fontSize: `${headerFontSize}px`, lineHeight: '1' }}>{viewMode === 'month' ? `Calendario ${monthNames[month]} ${year}` : `Calendario Anual ${year}`}</h1>
                                                <p className="text-xs text-gray-500 font-mono italic">{customHeader}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                             <p className="text-xs font-bold text-brand-primary uppercase">{viewMode === 'month' ? `${monthNames[month]} ${year}` : year}</p>
                                             <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                <PrinterIcon className="w-3 h-3" />
                                                <span>Programación Institucional</span>
                                             </div>
                                        </div>
                                    </div>

                                    <div className="w-full">
                                        {viewMode === 'month' ? (
                                            <div className="bg-white border border-gray-400 overflow-hidden flex flex-col" style={{ height: 'calc(816px - 160px - (2 * 40px))' }}>
                                                <div className="grid grid-cols-7 border-b border-gray-400 bg-gray-50">
                                                    {dayNames.map(d => (
                                                        <div key={d} className="py-2 text-center font-bold text-[10px] text-gray-700 uppercase tracking-widest">
                                                            {d}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-7 flex-1">
                                                    {(() => {
                                                        const totalDays = getDaysInMonth(month, year);
                                                        const firstDay = getFirstDayOfMonth(month, year);
                                                        const days = [];
                                                        const rowsCount = Math.ceil((totalDays + firstDay) / 7);
                                                        
                                                        // Use a smaller height for 6 rows vs 5 rows
                                                        const cellHeight = rowsCount === 6 ? 'h-[92px]' : 'h-[110px]';

                                                        for (let i = 0; i < firstDay; i++) {
                                                            days.push(<div key={`empty-${i}`} className={`w-full ${cellHeight} bg-gray-50 border border-gray-200`}></div>);
                                                        }
                                                        for (let d = 1; d <= totalDays; d++) {
                                                            const holiday = isHoliday(d, month, year);
                                                            days.push(
                                                                <div key={d} className={`relative flex flex-col border border-gray-300 p-1.5 ${cellHeight} bg-white`}>
                                                                    <div className="flex justify-between items-start w-full">
                                                                        <span className={`font-bold text-base ${holiday ? 'text-red-600' : 'text-gray-900'}`}>{d}</span>
                                                                        {holiday && holiday.isNonWorking && (
                                                                             <span className="text-[7px] text-right text-red-500 font-bold uppercase max-w-[70%] leading-none">{holiday.name}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-auto">
                                                                        {holiday && !holiday.isNonWorking && <p className="text-[8px] text-red-600 font-bold leading-tight">{holiday.name}</p>}
                                                                        {holiday && holiday.isNonWorking && <p className="text-[7px] text-red-400 uppercase font-mono">No Laborable</p>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return days;
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-4 gap-3">
                                                {monthNames.map((mName, mIndex) => {
                                                    const totalDays = getDaysInMonth(mIndex, year);
                                                    const firstDay = getFirstDayOfMonth(mIndex, year);
                                                    const rowsCount = Math.ceil((totalDays + firstDay) / 7);
                                                    const miniCellHeight = rowsCount === 6 ? 'h-6' : 'h-7';

                                                    return (
                                                        <div key={mIndex} className="bg-white border border-gray-300 p-2 shadow-none">
                                                            <h3 className="text-[10px] font-bold text-brand-primary mb-1 uppercase tracking-widest border-b border-gray-100">{mName}</h3>
                                                            <div className="grid grid-cols-7 mb-0.5">
                                                                {dayNames.map(d => (
                                                                    <div key={d} className="text-[6px] text-center font-bold text-gray-500 uppercase">{d[0]}</div>
                                                                ))}
                                                            </div>
                                                            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100">
                                                                {(() => {
                                                                    const days = [];
                                                                    for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} className={`${miniCellHeight} bg-gray-50`}></div>);
                                                                    for (let d = 1; d <= totalDays; d++) {
                                                                        const holiday = isHoliday(d, mIndex, year);
                                                                        days.push(
                                                                            <div key={d} className={`${miniCellHeight} text-[8px] flex items-center justify-center relative bg-white`}>
                                                                                <span className={holiday ? 'text-red-500 font-bold' : 'text-gray-700'}>{d}</span>
                                                                                {holiday && holiday.isNonWorking && <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-red-500"></div>}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return days;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 flex justify-between items-end border-t border-gray-200 pt-4">
                                        <div className="text-[9px] text-gray-400 w-full">
                                            <p className="uppercase">{customFooter}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Calendar Content for Capture */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                <div ref={calendarRef} data-calendar-root className="w-full bg-white dark:bg-transparent rounded-2xl p-0 md:p-4">
                    {/* Header that will appear in PDF */}
                    <div className="hidden pdf-only flex items-center justify-between border-b-2 border-brand-primary pb-4 mb-6">
                        <div className="flex items-center gap-4">
                            {customLogo && <img src={customLogo} alt="Logo" className="w-auto object-contain bg-white" style={{ height: `${logoHeight}px` }} crossOrigin="anonymous" />}
                            <div>
                                <h1 className="font-black text-gray-900 uppercase" style={{ fontSize: `${headerFontSize}px`, lineHeight: '1' }}>{viewMode === 'month' ? `Calendario ${monthNames[month]} ${year}` : `Calendario Anual ${year}`}</h1>
                                <p className="text-xs text-gray-500 font-mono italic">{customHeader}</p>
                            </div>
                        </div>
                                 <div className="text-right">
                                     <p className="text-xs font-bold text-brand-primary uppercase">{viewMode === 'month' ? `${monthNames[month]} ${year}` : year}</p>
                                     <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <PrinterIcon className="w-3 h-3" />
                                        <span>Programación Institucional</span>
                                     </div>
                                </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {viewMode === 'month' ? (
                            <motion.div 
                                key={`month-${month}-${year}`}
                                data-month-grid
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden"
                            >
                                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10">
                                    {dayNames.map(d => (
                                        <div key={d} className="py-4 text-center font-bold text-xs md:text-sm text-gray-600 dark:text-gray-400 uppercase tracking-widest bg-gray-50/50 dark:bg-white/5">
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 auto-rows-fr">
                                    {renderMonthGrid(month, year)}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key={`year-${year}`}
                                data-year-grid
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4"
                            >
                                {monthNames.map((mName, mIndex) => (
                                    <div key={mIndex} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-white/10 p-3 shadow-sm hover:border-brand-primary/30 transition-colors">
                                        <h3 
                                            className="text-xs font-bold text-brand-primary mb-2 uppercase tracking-widest"
                                        >
                                            {mName}
                                        </h3>
                                        <div className="grid grid-cols-7 mb-1">
                                            {dayNames.map(d => (
                                                <div key={d} className="text-[7px] text-center font-bold text-gray-400 uppercase">
                                                    {d[0]}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-white/5 rounded overflow-hidden">
                                            {renderMonthGrid(mIndex, year, true)}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Legal footer for PDF */}
                    <div className="hidden pdf-only mt-8 flex justify-between items-end border-t border-gray-200 pt-4">
                        <div className="text-[9px] text-gray-400 w-full">
                            <p className="uppercase">{customFooter}</p>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media screen {
                    .pdf-only { display: none !important; }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};

export default CalendarView;
