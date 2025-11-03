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
  isReadOnly: boolean;
}

const availableColors = [
  'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
];

const defaultRecurrence: RecurrenceRule = { type: 'none' };

const AuditModal: React.FC<AuditModalProps> = ({ audit, date, onClose, onSave, onDelete, isReadOnly }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [color, setColor] = useState(availableColors[3]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(defaultRecurrence);
  
  // New state for audit content
  const [auditType, setAuditType] = useState<'text' | 'checklist'>('text');
  const [contentText, setContentText] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (audit) {
      setTitle(audit.title);
      setTime(audit.timeOfAudit || '10:00');
      setColor(audit.color || availableColors[3]);
      setRecurrence(audit.recurrence || defaultRecurrence);
      setAuditType(audit.audit_type || 'text');
      setContentText(audit.content_text || '');
      setChecklist(audit.content_checklist || []);
    } else {
      // Reset for new audit
      setTitle('');
      setTime('10:00');
      setColor(availableColors[3]);
      setRecurrence(defaultRecurrence);
      setAuditType('text');
      setContentText('');
      setChecklist([]);
    }
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


  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" style={{ animationDuration: '0.2s' }} onClick={onClose}>
      <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-shrink-0 flex justify-between items-center p-6 border-b border-light-border dark:border-dark-border">
            <h2 className="text-2xl font-bold">{audit ? 'Detalles de Auditoría' : 'Nueva Auditoría'}</h2>
            <div className="flex items-center space-x-2">
                {!isReadOnly && audit && (<button type="button" onClick={handleDelete} className="p-2 rounded-full text-light-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500" title="Eliminar auditoría"><TrashIcon className="h-5 w-5" /></button>)}
                <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><XIcon className="h-6 w-6" /></button>
            </div>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto">
            {/* --- Scheduling Fields --- */}
            <input id="audit-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isReadOnly} placeholder="Título de la Auditoría" className="w-full text-xl font-semibold p-2 border-b-2 border-light-border dark:border-dark-border bg-transparent focus:outline-none focus:border-brand-primary"/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><p className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Fecha de Inicio</p><p className="w-full mt-1 p-2 text-light-text dark:text-dark-text">{formattedDate}</p></div>
              <div><label htmlFor="audit-time" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Hora</label><input id="audit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required disabled={isReadOnly} className="w-full mt-1 p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"/></div>
            </div>
            
            {/* --- Recurrence and Color --- */}
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
                  <input
                    type="number"
                    min="1"
                    value={recurrence.interval || 1}
                    onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value, 10))}
                    disabled={isReadOnly}
                    className="w-16 p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"
                  />
                  <select
                    value={recurrence.unit || 'days'}
                    onChange={(e) => handleRecurrenceChange('unit', e.target.value)}
                    disabled={isReadOnly}
                    className="p-2 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"
                  >
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
                {availableColors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => !isReadOnly && setColor(c)}
                    disabled={isReadOnly}
                    className={`w-8 h-8 rounded-full ${c} transition-transform hover:scale-110 focus:outline-none ${color === c ? 'ring-2 ring-offset-2 ring-brand-primary dark:ring-offset-dark-card' : ''}`}
                    aria-label={`Color ${c.split('-')[1]}`}
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-light-border dark:border-dark-border my-4"></div>

            {/* --- Audit Content Fields --- */}
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">Tipo de Auditoría</label>
              <div className="flex space-x-2">
                <button type="button" onClick={() => !isReadOnly && setAuditType('text')} disabled={isReadOnly} className={`px-4 py-2 text-sm font-medium rounded-md ${auditType === 'text' ? 'bg-brand-primary text-white' : 'bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border'}`}>Texto</button>
                <button type="button" onClick={() => !isReadOnly && setAuditType('checklist')} disabled={isReadOnly} className={`px-4 py-2 text-sm font-medium rounded-md ${auditType === 'checklist' ? 'bg-brand-primary text-white' : 'bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border'}`}>Checklist</button>
              </div>
            </div>

            <div className="mt-4">
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

          <div className="flex-shrink-0 p-6 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">Cerrar</button>
            {!isReadOnly && (<button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">{audit ? 'Guardar Cambios' : 'Guardar Auditoría'}</button>)}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuditModal;