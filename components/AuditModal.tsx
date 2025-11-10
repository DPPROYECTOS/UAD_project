import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AuditItem, RecurrenceRule, ChecklistItem } from '../types';
import { XIcon, TrashIcon, PlusIcon } from './Icons';

interface AuditModalProps {
  audit: AuditItem | null;
  date: string;
  onClose: () => void;
  onSave: (auditData: Omit<AuditItem, 'id'>) => void;
  onDelete: (auditId: string) => void;
  onClone: (auditData: Omit<AuditItem, 'id' | 'date'>, dates: string[]) => void;
  isReadOnly: boolean;
}

const availableColors = [
  'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
];

const defaultRecurrence: RecurrenceRule = { type: 'none' };

const AuditModal: React.FC<AuditModalProps> = ({ audit, date, onClose, onSave, onDelete, onClone, isReadOnly }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [color, setColor] = useState(availableColors[3]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(defaultRecurrence);
  
  // New state for audit content
  const [auditType, setAuditType] = useState<'text' | 'checklist'>('text');
  const [contentText, setContentText] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [note, setNote] = useState('');

  // --- Clone state ---
  const [cloneDates, setCloneDates] = useState<string[]>([]);
  const [currentCloneDate, setCurrentCloneDate] = useState<string>('');


  useEffect(() => {
    if (audit) {
      setTitle(audit.title);
      setTime(audit.timeOfAudit || '10:00');
      setColor(audit.color || availableColors[3]);
      setRecurrence(audit.recurrence || defaultRecurrence);
      setAuditType(audit.audit_type || 'text');
      setContentText(audit.content_text || '');
      setChecklist(audit.content_checklist || []);
      setNote(audit.note || '');
    } else {
      // Reset for new audit
      setTitle('');
      setTime('10:00');
      setColor(availableColors[3]);
      setRecurrence(defaultRecurrence);
      setAuditType('text');
      setContentText('');
      setChecklist([]);
      setNote('');
    }
    // Reset clone state when modal opens
    setCloneDates([]);
    setCurrentCloneDate('');
  }, [audit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && !isReadOnly) {
      const finalChecklist = auditType === 'checklist' ? checklist.filter(item => item.text.trim() !== '') : null;
      onSave({
        title: title.trim(),
        date: audit ? audit.date : date,
        timeOfAudit: time,
        color,
        recurrence,
        audit_type: auditType,
        content_text: auditType === 'text' ? contentText : null,
        content_checklist: finalChecklist,
        note: note || null,
      });
    }
  };

  const handleDelete = () => { if (audit && !isReadOnly) onDelete(audit.id); };
  
  const handleRecurrenceChange = (key: keyof RecurrenceRule, value: any) => {
    if (isReadOnly) return;
    if (key === 'type') {
      if (value === 'none') {
        setRecurrence({ type: 'none' });
      } else if (value === 'weekly' || value === 'monthly') {
        setRecurrence({ type: value });
      } else { // custom
        setRecurrence({ type: 'custom', interval: 1, unit: 'days' });
      }
    } else {
      setRecurrence(prev => ({ ...prev, [key]: value }));
    }
  };
  
  // --- Checklist Handlers ---
  const addChecklistItem = () => {
    setChecklist(prev => [...prev, { id: uuidv4(), text: '', completed: false }]);
  };

  const updateChecklistItem = (id: string, newText: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, text: newText } : item));
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const deleteChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  // --- Clone Handlers ---
  const handleAddCloneDate = () => {
      if (currentCloneDate && !cloneDates.includes(currentCloneDate)) {
          setCloneDates([...cloneDates, currentCloneDate].sort());
          setCurrentCloneDate('');
      }
  };

  const handleRemoveCloneDate = (dateToRemove: string) => {
      setCloneDates(cloneDates.filter(d => d !== dateToRemove));
  };
  
  const handleClone = () => {
      if (cloneDates.length > 0 && audit && !isReadOnly) {
          const auditToClone: Omit<AuditItem, 'id' | 'date'> = {
              title: title.trim(),
              timeOfAudit: time,
              color,
              // Clones are always single instances, not recurring.
              recurrence: { type: 'none' },
              audit_type: auditType,
              content_text: auditType === 'text' ? contentText : null,
              content_checklist: auditType === 'checklist' ? checklist.filter(item => item.text.trim() !== '') : null,
              note: note || null,
          };
          onClone(auditToClone, cloneDates);
          onClose(); // Close modal after initiating clone
      }
  };


  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" style={{ animationDuration: '0.2s' }} onClick={onClose}>
      <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-shrink-0 flex justify-between items-center p-6 border-b border-light-border dark:border-dark-border">
            <h2 className="text-2xl font-bold">{audit ? 'Detalles de Auditoría' : 'Nueva Auditoría'}</h2>
            <div className="flex items-center space-x-2">
                {!isReadOnly && audit && (<button type="button" onClick={handleDelete} className="p-2 rounded-full text-light-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500" title="Eliminar auditoría"><TrashIcon className="h-5 w-5" /></button>)}
                <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><XIcon className="h-6 w-6" /></button>
            </div>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            <input id="audit-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isReadOnly} placeholder="Título de la Auditoría" className="w-full text-xl font-semibold p-2 border-b-2 border-light-border dark:border-dark-border bg-transparent focus:outline-none focus:border-brand-primary"/>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
              {/* --- Left Column: Settings --- */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Fecha de Inicio</p><p className="w-full mt-1 p-2 text-light-text dark:text-dark-text">{formattedDate}</p></div>
                  <div><label htmlFor="audit-time" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Hora</label><input id="audit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required disabled={isReadOnly} className="w-full mt-1 p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"/></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">Repetir</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleRecurrenceChange('type', 'none')} disabled={isReadOnly} className={`px-3 py-1.5 text-sm rounded-md ${recurrence.type === 'none' ? 'bg-brand-primary text-white' : 'bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border'}`}>Nunca</button>
                    <button type="button" onClick={() => handleRecurrenceChange('type', 'weekly')} disabled={isReadOnly} className={`px-3 py-1.5 text-sm rounded-md ${recurrence.type === 'weekly' ? 'bg-brand-primary text-white' : 'bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border'}`}>Semanal</button>
                    <button type="button" onClick={() => handleRecurrenceChange('type', 'monthly')} disabled={isReadOnly} className={`px-3 py-1.5 text-sm rounded-md ${recurrence.type === 'monthly' ? 'bg-brand-primary text-white' : 'bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border'}`}>Mensual</button>
                    <button type="button" onClick={() => handleRecurrenceChange('type', 'custom')} disabled={isReadOnly} className={`px-3 py-1.5 text-sm rounded-md ${recurrence.type === 'custom' ? 'bg-brand-primary text-white' : 'bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border'}`}>Personalizado</button>
                  </div>
                  {recurrence.type === 'custom' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm">Repetir cada</span>
                      <input type="number" min="1" value={recurrence.interval || 1} onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value, 10))} disabled={isReadOnly} className="w-16 p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"/>
                      <select value={recurrence.unit || 'days'} onChange={(e) => handleRecurrenceChange('unit', e.target.value)} disabled={isReadOnly} className="p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md">
                        <option value="days">días</option>
                        <option value="weeks">semanas</option>
                        <option value="months">meses</option>
                      </select>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">Color del Evento</label>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(c => (<button key={c} type="button" onClick={() => !isReadOnly && setColor(c)} disabled={isReadOnly} className={`w-8 h-8 rounded-full ${c} transition-transform hover:scale-110 focus:outline-none ${color === c ? 'ring-2 ring-offset-2 ring-brand-primary dark:ring-offset-dark-card' : ''}`} aria-label={`Color ${c.split('-')[1]}`} />))}
                  </div>
                </div>
              </div>

              {/* --- Right Column: Content --- */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">Tipo de Auditoría</label>
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => !isReadOnly && setAuditType('text')} disabled={isReadOnly} className={`px-4 py-2 text-sm font-medium rounded-md ${auditType === 'text' ? 'bg-brand-primary text-white' : 'bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border'}`}>Texto</button>
                    <button type="button" onClick={() => !isReadOnly && setAuditType('checklist')} disabled={isReadOnly} className={`px-4 py-2 text-sm font-medium rounded-md ${auditType === 'checklist' ? 'bg-brand-primary text-white' : 'bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border'}`}>Checklist</button>
                  </div>
                </div>
                
                <div>
                  {auditType === 'text' ? (
                    <div>
                      <label htmlFor="content-text" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Contenido de la Auditoría</label>
                      <textarea id="content-text" rows={8} value={contentText} onChange={e => setContentText(e.target.value)} disabled={isReadOnly} placeholder="Escribe aquí los detalles, notas o hallazgos de la auditoría..." className="w-full p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"/>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Lista de Verificación</label>
                      <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                        {checklist.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 group">
                            <input type="checkbox" checked={item.completed} onChange={() => !isReadOnly && toggleChecklistItem(item.id)} disabled={isReadOnly} className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary border-gray-300 dark:border-gray-600"/>
                            <input type="text" value={item.text} onChange={e => updateChecklistItem(item.id, e.target.value)} disabled={isReadOnly} placeholder={`Punto de verificación ${index + 1}`} className={`flex-grow p-2 border bg-transparent rounded-md ${item.completed ? 'line-through text-gray-500' : ''}`}/>
                            {!isReadOnly && <button type="button" onClick={() => deleteChecklistItem(item.id)} className="p-1 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><TrashIcon className="h-4 w-4"/></button>}
                          </div>
                        ))}
                      </div>
                      {!isReadOnly && <button type="button" onClick={addChecklistItem} className="flex items-center gap-2 text-sm font-medium text-brand-primary mt-2"><PlusIcon className="h-4 w-4"/> Añadir punto de verificación</button>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --- Optional Note Section (Full Width) --- */}
            <div>
              <label htmlFor="optional-note" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Nota Opcional</label>
              <textarea id="optional-note" rows={3} value={note} onChange={e => setNote(e.target.value)} disabled={isReadOnly} placeholder="Añade una nota adicional o un recordatorio aquí..." className="w-full p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"/>
            </div>

            {/* --- Clone Section (Full Width) --- */}
            {audit && !isReadOnly && (
              <div className="border-t border-light-border dark:border-dark-border pt-4">
                  <h3 className="text-lg font-bold">Clonar Auditoría</h3>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">Crea una copia de esta auditoría en otras fechas. Cada copia será un evento único e independiente.</p>
                  <div className="flex items-center gap-2 mb-2">
                      <input type="date" value={currentCloneDate} onChange={e => setCurrentCloneDate(e.target.value)} className="flex-grow p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"/>
                      <button type="button" onClick={handleAddCloneDate} disabled={!currentCloneDate} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-400">Añadir Fecha</button>
                  </div>
                  {cloneDates.length > 0 && (
                      <div>
                          <p className="text-xs font-semibold uppercase text-light-text-secondary dark:text-dark-text-secondary">Fechas para clonar:</p>
                          <ul className="flex flex-wrap gap-2 mt-2">
                              {cloneDates.map(d => (
                                  <li key={d} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm">
                                      {d}
                                      <button type="button" onClick={() => handleRemoveCloneDate(d)} className="text-gray-500 hover:text-red-500"><XIcon className="h-4 w-4"/></button>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 p-6 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border flex justify-between items-center rounded-b-lg">
             <div>
                {audit && !isReadOnly && cloneDates.length > 0 && (
                    <button type="button" onClick={handleClone} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Clonar y Cerrar</button>
                )}
            </div>
            <div className="flex justify-end space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">Cerrar</button>
                {!isReadOnly && (<button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">{audit ? 'Guardar Cambios' : 'Guardar Auditoría'}</button>)}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuditModal;