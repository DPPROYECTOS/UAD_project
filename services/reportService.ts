
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, VerticalAlign, ShadingType, ImageRun } from 'docx';
import { GoogleGenAI } from '@google/genai';
import { Project, ProjectTask, IshikawaDiagramData, Document as AppDocument, TaskStatus } from '../types';

interface ReportData {
    project: Project;
    tasks: ProjectTask[];
    documents: AppDocument[];
    ishikawa?: IshikawaDiagramData | null;
    ganttImage?: string; 
}

/**
 * Tarea enriquecida con metadatos jerárquicos para el reporte.
 */
type HierarchicalTaskReport = ProjectTask & { level: number; wbs: string };

/**
 * Aplana las tareas manteniendo la jerarquía y generando el código WBS (1, 1.1, etc.)
 */
const getHierarchicalTasksForReport = (tasks: ProjectTask[]): HierarchicalTaskReport[] => {
    const taskMap = new Map(tasks.map(task => [task.id, { ...task, children: [] as ProjectTask[] }]));
    const rootTasks: (ProjectTask & { children: ProjectTask[] })[] = [];

    tasks.forEach(task => {
        if (task.parentId && taskMap.has(task.parentId)) {
            taskMap.get(task.parentId)?.children.push(taskMap.get(task.id)!);
        } else {
            rootTasks.push(taskMap.get(task.id)!);
        }
    });
    
    // Ordenar por fecha en cada nivel
    taskMap.forEach(task => task.children.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')));
    rootTasks.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const flattened: HierarchicalTaskReport[] = [];
    const traverse = (task: ProjectTask, level: number, parentWbs: string, index: number) => {
        const currentWbs = parentWbs ? `${parentWbs}.${index + 1}` : `${index + 1}`;
        flattened.push({ ...task, level, wbs: currentWbs });
        const node = taskMap.get(task.id);
        if (node) {
            node.children.forEach((child, i) => traverse(child, level + 1, currentWbs, i));
        }
    };

    rootTasks.forEach((task, i) => traverse(task, 0, "", i));
    return flattened;
};

/**
 * Genera una imagen base64 de un gráfico de dona para el progreso.
 */
const generateProgressDonut = (percentage: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const centerX = 200;
    const centerY = 200;
    const radius = 150;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 40;
    ctx.stroke();

    const endAngle = (percentage / 100) * 2 * Math.PI - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage}%`, centerX, centerY);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#6B7280';
    ctx.fillText('AVANCE', centerX, centerY + 60);

    return canvas.toDataURL('image/png');
};

/**
 * Genera una imagen base64 de un gráfico de barras para el estado de tareas.
 */
const generateTaskStatusBars = (completed: number, failed: number, pending: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const data = [
        { label: 'ÉXITO', value: completed, color: '#22C55E' },
        { label: 'FALLAS', value: failed, color: '#EF4444' },
        { label: 'PENDIENTE', value: pending, color: '#9CA3AF' }
    ];

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const chartWidth = 500;
    const chartHeight = 300;
    const barWidth = 80;
    const gap = 60;

    data.forEach((d, i) => {
        const h = (d.value / maxVal) * chartHeight;
        const x = 80 + i * (barWidth + gap);
        const y = 350 - h;

        ctx.fillStyle = d.color;
        ctx.fillRect(x, y, barWidth, h);

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.fillText(d.value.toString(), x + barWidth / 2, y - 10);

        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#6B7280';
        ctx.fillText(d.label, x + barWidth / 2, 380);
    });

    return canvas.toDataURL('image/png');
};

const createSafeCellParagraph = (text: string | undefined | null, isBold: boolean = false, isItalic: boolean = false) => {
    const content = (text || '').trim();
    const finalContent = content === '' ? '---' : content;

    return new Paragraph({
        children: [
            new TextRun({
                text: finalContent,
                bold: isBold,
                italics: isItalic,
                font: "Arial",
                size: 20,
                color: "000000"
            })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { before: 80, after: 80 }
    });
};

/**
 * Crea un párrafo para el estado de la tarea con colores de semáforo.
 */
const createStatusParagraph = (status: TaskStatus) => {
    const label = status === 'completed' ? 'ÉXITO' : status === 'failed' ? 'INCIDENCIA' : 'PENDIENTE';
    const color = status === 'completed' ? '228B22' : status === 'failed' ? 'B22222' : '6B7280';
    
    return new Paragraph({
        children: [
            new TextRun({
                text: label,
                bold: true,
                font: "Arial",
                size: 18,
                color: color
            })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 }
    });
};

/**
 * Crea un párrafo para el título de la tarea con indentación jerárquica.
 */
const createHierarchicalTitleParagraph = (task: HierarchicalTaskReport) => {
    const prefix = task.level > 0 ? "↳ " : "";
    const text = `${prefix}${task.wbs} ${task.title}`;
    
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                bold: task.level === 0,
                italics: task.level > 1,
                font: "Arial",
                size: task.level === 0 ? 20 : 18,
                color: task.level === 0 ? "000000" : "4B5563"
            })
        ],
        alignment: AlignmentType.LEFT,
        indent: { left: task.level * 360 }, // 360 twips approx 0.6cm
        spacing: { before: 80, after: 80 }
    });
};

export const generateCorporateReport = async (data: ReportData, apiKey: string): Promise<Blob> => {
    const { project, tasks, documents, ishikawa } = data;
    const ai = new GoogleGenAI({ apiKey });
    
    const hierarchicalTasks = getHierarchicalTasksForReport(tasks);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed');
    const failedTasksCount = failedTasks.length;
    const pendingTasks = totalTasks - completedTasks - failedTasksCount;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const docNames = documents.map(d => d.name).join(', ');

    const progressChartBase64 = generateProgressDonut(progress);
    const statusChartBase64 = generateTaskStatusBars(completedTasks, failedTasksCount, pendingTasks);

    const contextPrompt = `
        Genera el contenido textual para un REPORTE CORPORATIVO DE PROYECTO en formato profesional.
        PROYECTO: "${project.name}"
        OBJETIVO: "${project.objective}"
        ESTADÍSTICAS: Avance ${progress}%, ${failedTasksCount} incidencias, ${pendingTasks} pendientes.
        INCIDENCIAS REGISTRADAS: ${failedTasks.map(t => t.title + (t.comments ? `: ${t.comments}` : '')).join('; ') || 'Ninguna'}
        DOCUMENTOS ADJUNTOS: [${docNames || 'Ninguno'}]

        NECESITO:
        1. RESUMEN EJECUTIVO: Síntesis estratégica de lo logrado.
        2. OBSERVACIONES TÉCNICAS: Basado en los datos del proyecto, redacta un análisis que cubra:
           - Lo que hay actualmente (logros).
           - Lo que falta por ejecutar.
           - Lo que no se cumplió (incidencias).
           - Cómo repercute esto en la continuidad del proyecto.
        3. RELEVANCIA DE DOCUMENTOS: Para cada documento, explica brevemente su valor para el proyecto.
        
        Devuelve estrictamente un JSON: 
        { "executiveSummary": "...", "observations": "...", "docRelevance": { "nombre": "..." } }
    `;

    let aiContent = { 
        executiveSummary: project.executiveSummary || 'Sin resumen registrado.', 
        observations: 'Análisis operativo pendiente de validación por IA.',
        docRelevance: {} as Record<string, string>
    };

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: contextPrompt,
            config: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(result.text);
        aiContent.executiveSummary = project.executiveSummary || parsed.executiveSummary;
        aiContent.observations = parsed.observations;
        aiContent.docRelevance = parsed.docRelevance || {};
    } catch (e) {
        console.warn("AI bypassed", e);
    }

    const categoryLabels: Record<string, string> = {
        method: 'Métodos', machine: 'Maquinaria', material: 'Materiales',
        manpower: 'Mano de Obra', measurement: 'Medición', environment: 'Medio Ambiente'
    };

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "REPORTE CORPORATIVO DE PROYECTO", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { before: 2000, after: 400 } }),
                new Paragraph({ text: "UAD SYSTEM VALIDATION v2.5", alignment: AlignmentType.CENTER, spacing: { after: 2000 } }),
                new Paragraph({ text: (project.name || 'PROYECTO').toUpperCase(), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 1200 } }),
                new Paragraph({ children: [new TextRun({ text: "LÍDER: ", bold: true }), new TextRun({ text: (project.leader || 'N/A').toUpperCase() })], spacing: { after: 200 } }),
                new Paragraph({ children: [new TextRun({ text: "PERIODO: ", bold: true }), new TextRun({ text: `${project.startDate} - ${project.endDate || 'ACTIVO'}` })], spacing: { after: 4000 } }),
                new Paragraph({ text: "Suave y Facil S.A. de C.V. - Confidencial", alignment: AlignmentType.CENTER }),

                new Paragraph({ text: "1. RESUMEN EJECUTIVO", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 400 }, pageBreakBefore: true }),
                new Paragraph({ children: [new TextRun({ text: aiContent.executiveSummary, font: "Arial", size: 24 })], spacing: { after: 600 } }),

                new Paragraph({ text: "2. INDICADORES CLAVE DE DESEMPEÑO (KPI)", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 400 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new ImageRun({
                                                    data: progressChartBase64,
                                                    transformation: { width: 220, height: 220 }
                                                })
                                            ]
                                        }),
                                        new Paragraph({ text: "Progreso Real", alignment: AlignmentType.CENTER, spacing: { before: 100 } })
                                    ],
                                    width: { size: 50, type: WidthType.PERCENTAGE }
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new ImageRun({
                                                    data: statusChartBase64,
                                                    transformation: { width: 300, height: 200 }
                                                })
                                            ]
                                        }),
                                        new Paragraph({ text: "Distribución de Tareas", alignment: AlignmentType.CENTER, spacing: { before: 100 } })
                                    ],
                                    width: { size: 50, type: WidthType.PERCENTAGE }
                                })
                            ]
                        })
                    ]
                }),

                // --- 3. GESTIÓN DE TAREAS JERÁRQUICA ---
                new Paragraph({ text: "3. GESTIÓN JERÁRQUICA DE TAREAS (WBS)", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 400 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [createSafeCellParagraph("Fecha Inicio", true)], shading: { fill: "D1D5DB" }, width: { size: 12, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [createSafeCellParagraph("Estructura / Actividad", true)], shading: { fill: "D1D5DB" }, width: { size: 48, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [createSafeCellParagraph("Estado", true)], shading: { fill: "D1D5DB" }, width: { size: 15, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [createSafeCellParagraph("Responsable", true)], shading: { fill: "D1D5DB" }, width: { size: 25, type: WidthType.PERCENTAGE } }),
                            ]
                        }),
                        ...(hierarchicalTasks.length > 0 ? hierarchicalTasks.map(t => new TableRow({
                            children: [
                                new TableCell({ children: [createSafeCellParagraph(t.startDate)], verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [createHierarchicalTitleParagraph(t)], shading: t.level === 0 ? { fill: "F9FAFB" } : undefined, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [createStatusParagraph(t.status)], verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [createSafeCellParagraph(t.assignedTo, false, t.level > 0)], verticalAlign: VerticalAlign.CENTER }),
                            ]
                        })) : [])
                    ]
                }),

                ...(project.ishikawaEnabled && ishikawa ? [
                    new Paragraph({ text: "4. ANÁLISIS DE CAUSA RAÍZ (ISHIKAWA)", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 400 } }),
                    ...Object.entries(ishikawa.causes).filter(([_, l]) => l.length > 0).map(([cat, l]) => [
                        new Paragraph({ children: [new TextRun({ text: categoryLabels[cat] || cat, bold: true, underline: {} })], spacing: { before: 200 } }),
                        ...l.map(c => new Paragraph({ children: [new TextRun({ text: `• ${c}`, font: "Arial", size: 22 })], indent: { left: 720 } }))
                    ]).flat()
                ] : []),

                new Paragraph({ text: "5. DOCUMENTACIÓN Y RELEVANCIA", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 400 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [createSafeCellParagraph("Documento", true)], shading: { fill: "D1D5DB" } }),
                                new TableCell({ children: [createSafeCellParagraph("Relevancia Estratégica", true)], shading: { fill: "D1D5DB" } }),
                            ]
                        }),
                        ...(documents.map(d => new TableRow({
                            children: [
                                new TableCell({ children: [createSafeCellParagraph(d.name, true)] }),
                                new TableCell({ children: [createSafeCellParagraph(aiContent.docRelevance[d.name] || "Soporte técnico operativo.")] }),
                            ]
                        })))
                    ]
                }),

                new Paragraph({ text: "6. CONCLUSIONES Y OBSERVACIONES", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 400 } }),
                new Paragraph({ 
                    children: [new TextRun({ text: "Conclusión Estratégica:", bold: true, size: 24 })],
                    spacing: { after: 200 }
                }),
                new Paragraph({ 
                    children: [new TextRun({ text: project.finalConclusions || "Se concluye que el proyecto avanza según los estándares de calidad establecidos por la UAD.", size: 24 })],
                    spacing: { after: 400 }
                }),
                new Paragraph({ 
                    children: [new TextRun({ text: "Observaciones de Continuidad:", bold: true, size: 24 })],
                    spacing: { after: 200 }
                }),
                new Paragraph({ 
                    children: [new TextRun({ text: aiContent.observations, size: 24, italics: true })], 
                    spacing: { after: 1200 } 
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                    rows: [new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "__________________________", alignment: AlignmentType.CENTER }), new Paragraph({ text: "LÍDER DE PROYECTO", bold: true, alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "__________________________", alignment: AlignmentType.CENTER }), new Paragraph({ text: "DIRECCIÓN DE CALIDAD", bold: true, alignment: AlignmentType.CENTER })] }),
                        ]
                    })]
                })
            ]
        }]
    });

    return await Packer.toBlob(doc);
};
