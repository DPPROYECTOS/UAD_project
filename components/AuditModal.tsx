import React, { useState, useEffect } from 'react';
import { AuditItem, RecurrenceRule } from '../types';
import { XIcon, TrashIcon } from './Icons';

interface AuditModalProps {
  audit: AuditItem | null;
  date: string;
  onClose: () => void;
  onSave: (auditData: { title: string, color: string, recurrence: RecurrenceRule }) => void;
  onDelete: (auditId: string) => void;
}

const availableColors = [
  'bg-red-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
];

const defaultRecurrence: RecurrenceRule = { type: 'none' };

const AuditModal: React.FC<AuditModalProps> = ({ audit, date, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(availableColors[3]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(defaultRecurrence);

  useEffect(() => {
    if (audit) {
      setTitle(audit.title);
      setColor(audit.color || availableColors[3]);
      setRecurrence(audit.recurrence || defaultRecurrence);
    } else {
      setTitle('');
      setColor(availableColors[3]);
      setRecurrence(defaultRecurrence);
    }
  }, [audit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave({ title: title.trim(), color, recurrence });
    }
  };
  
  const handleDelete = () => {
    if (audit) {
      onDelete(audit.id);
    }
  };
  
  const handleRecurrenceChange = (key: keyof RecurrenceRule, value: any) => {
    setRecurrence(prev => {
        const newRecurrence = { ...prev };
        (newRecurrence as any)[key] = value;
        
        if (key === 'type' && value !== 'custom') {
            delete newRecurrence.interval;
            delete newRecurrence.unit;
        }
        if (key === 'type' && value === 'custom') {
            newRecurrence.interval = 1;
            newRecurrence.unit = 'days';
        }
        return newRecurrence;
    });
  };

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
    >
      <div
        className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center p-6 border-b border-light-border dark:border-dark-border">
            <h2 className="text-2xl font-bold">{audit ? 'Editar Auditoría' : 'Nueva Auditoría'}</h2>
            <div className="flex items-center space-x-2">
                {audit && (
                    <button type="button" onClick={handleDelete} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500" title="Eliminar auditoría">
                        <TrashIcon className="h-5 w-5" />
                    </button>
                )}
                <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="audit-title" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Título de la Auditoría
              </label>
              <input
                id="audit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ej: Auditoría de Seguridad Trimestral"
                className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>
            <div>
              <p className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Fecha de Inicio
              </p>
              <p className="w-full mt-1 p-2 text-light-text dark:text-dark-text">{formattedDate}</p>
            </div>

            <div>
                <label htmlFor="recurrence-type" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    Repetir
                </label>
                <div className="flex items-center gap-2">
                    <select
                        id="recurrence-type"
                        value={recurrence.type}
                        onChange={(e) => handleRecurrenceChange('type', e.target.value)}
                        className="w-full p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent focus:border-brand-accent"
                    >
                        <option value="none">No se repite</option>
                        <option value="weekly">Cada semana</option>
                        <option value="monthly">Cada mes</option>
                        <option value="custom">Personalizado</option>
                    </select>
                </div>
                {recurrence.type === 'custom' && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm">Cada</span>
                        <input
                            type="number"
                            value={recurrence.interval || 1}
                            onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-20 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"
                        />
                        <select
                            value={recurrence.unit || 'days'}
                            onChange={(e) => handleRecurrenceChange('unit', e.target.value)}
                            className="p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"
                        >
                            <option value="days">días</option>
                            <option value="weeks">semanas</option>
                            <option value="months">meses</option>
                        </select>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    Etiqueta de Color
                </label>
                <div className="flex items-center space-x-3">
                    {availableColors.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={`h-8 w-8 rounded-full cursor-pointer transition-transform transform hover:scale-110 ${c} ${color === c ? 'ring-2 ring-offset-2 ring-brand-primary dark:ring-offset-dark-card' : ''}`}
                            aria-label={`Color ${c}`}
                        />
                    ))}
                </div>
            </div>
          </div>

          <div className="p-6 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary"
            >
              {audit ? 'Guardar Cambios' : 'Guardar Auditoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuditModal;
