
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, VerticalAlign, ShadingType, ImageRun } from 'docx';
import { GoogleGenAI } from '@google/genai';
import { Project, ProjectTask, IshikawaDiagramData, Document as AppDocument } from '../types';

interface ReportData {
    project: Project;
    tasks: ProjectTask[];
    documents: AppDocument[];
    ishikawa?: IshikawaDiagramData | null;
    ganttImage?: string; // Imagen base64 del diagrama de Gantt
}

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

    // Fondo (Gris claro)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 40;
    ctx.stroke();

    // Progreso (Azul Marca)
    const endAngle = (percentage / 100) * 2 * Math.PI - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Texto Central
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

        // Barra
        ctx.fillStyle = d.color;
        ctx.fillRect(x, y, barWidth, h);

        // Valor sobre la barra
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.fillText(d.value.toString(), x + barWidth / 2, y - 10);

        // Etiqueta debajo
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

export const generateCorporateReport = async (data: ReportData, apiKey: string): Promise<Blob> => {
    const { project, tasks, documents, ishikawa, ganttImage } = data;
    const ai = new GoogleGenAI({ apiKey });
    
    const sortedTasks = [...tasks].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed');
    const failedTasksCount = failedTasks.length;
    const pendingTasks = totalTasks - completedTasks - failedTasksCount;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const docNames = documents.map(d => d.name).join(', ');

    // Generar Gráficos
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
                // --- PORTADA ---
                new Paragraph({ text: "REPORTE CORPORATIVO DE PROYECTO", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { before: 2000, after: 400 } }),
                new Paragraph({ text: "UAD SYSTEM VALIDATION v2.5", alignment: AlignmentType.CENTER, spacing: { after: 2000 } }),
                new Paragraph({ text: (project.name || 'PROYECTO').toUpperCase(), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 1200 } }),
                new Paragraph({ children: [new TextRun({ text: "LÍDER: ", bold: true }), new TextRun({ text: (project.leader || 'N/A').toUpperCase() })], spacing: { after: 200 } }),
                new Paragraph({ children: [new TextRun({ text: "PERIODO: ", bold: true }), new TextRun({ text: `${project.startDate} - ${project.endDate || 'ACTIVO'}` })], spacing: { after: 4000 } }),
                new Paragraph({ text: "Suave y Facil S.A. de C.V. - Confidencial", alignment: AlignmentType.CENTER }),

                // --- 1. RESUMEN EJECUTIVO ---
                new Paragraph({ text: "1. RESUMEN EJECUTIVO", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 400 }, pageBreakBefore: true }),
                new Paragraph({ children: [new TextRun({ text: aiContent.executiveSummary, font: "Arial", size: 24 })], spacing: { after: 600 } }),

                // --- 2. MÉTRICAS DE DESEMPEÑO VISUAL ---
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

                // --- 3. GESTIÓN DE TAREAS ---
                new Paragraph({ text: "3. GESTIÓN CRONOLÓGICA DE TAREAS", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 400 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [createSafeCellParagraph("Fecha Inicio", true)], shading: { fill: "D1D5DB" }, width: { size: 15, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [createSafeCellParagraph("Tarea / Actividad", true)], shading: { fill: "D1D5DB" }, width: { size: 45, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [createSafeCellParagraph("Estado", true)], shading: { fill: "D1D5DB" }, width: { size: 15, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [createSafeCellParagraph("Responsable", true)], shading: { fill: "D1D5DB" }, width: { size: 25, type: WidthType.PERCENTAGE } }),
                            ]
                        }),
                        ...(sortedTasks.length > 0 ? sortedTasks.map(t => new TableRow({
                            children: [
                                new TableCell({ children: [createSafeCellParagraph(t.startDate)] }),
                                new TableCell({ children: [createSafeCellParagraph(t.title)] }),
                                new TableCell({ children: [createSafeCellParagraph(t.status === 'completed' ? 'ÉXITO' : t.status === 'failed' ? 'INCIDENCIA' : 'PENDIENTE')] }),
                                new TableCell({ children: [createSafeCellParagraph(t.assignedTo)] }),
                            ]
                        })) : [])
                    ]
                }),

                // --- 4. ISHIKAWA ---
                ...(project.ishikawaEnabled && ishikawa ? [
                    new Paragraph({ text: "4. ANÁLISIS DE CAUSA RAÍZ (ISHIKAWA)", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 400 } }),
                    ...Object.entries(ishikawa.causes).filter(([_, l]) => l.length > 0).map(([cat, l]) => [
                        new Paragraph({ children: [new TextRun({ text: categoryLabels[cat] || cat, bold: true, underline: {} })], spacing: { before: 200 } }),
                        ...l.map(c => new Paragraph({ children: [new TextRun({ text: `• ${c}`, font: "Arial", size: 22 })], indent: { left: 720 } }))
                    ]).flat()
                ] : []),

                // --- 5. DOCUMENTOS ---
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

                // --- 6. CONCLUSIONES Y OBSERVACIONES ---
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

                // --- FIRMAS ---
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
