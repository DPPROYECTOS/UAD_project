import React, { useState, useEffect } from 'react';
import { XIcon, SelectionIcon } from '../Icons';

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'pdf';
  includeBackground: boolean;
  width: number;
  height: number;
  exportType: 'all' | 'selection';
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  onStartSelection: () => void;
  initialBounds: { width: number; height: number; type: 'all' | 'selection' } | null;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, onStartSelection, initialBounds }) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'png',
    includeBackground: true,
    width: 1920,
    height: 1080,
    exportType: 'all',
  });

  useEffect(() => {
    if (isOpen && initialBounds) {
      setOptions(prev => ({
        ...prev,
        width: Math.max(1, initialBounds.width),
        height: Math.max(1, initialBounds.height),
        exportType: initialBounds.type,
      }));
    }
  }, [isOpen, initialBounds]);

  if (!isOpen) return null;

  const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setOptions(prev => ({ ...prev, [name]: numValue }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(options);
  };
  
  const handleSelectArea = () => {
    onStartSelection();
    onClose();
  };
  
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
            <h2 className="text-2xl font-bold">Exportar Pizarra</h2>
            <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">
              <XIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Export Area */}
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">Área a Exportar</label>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setOptions(prev => ({...prev, exportType: 'all'}))}
                  className={`relative inline-flex items-center px-4 py-2 rounded-l-md border text-sm font-medium ${options.exportType === 'all' ? 'bg-brand-primary text-white border-brand-primary z-10' : 'border-gray-300 dark:border-gray-600 bg-light-card dark:bg-dark-card hover:bg-light-bg dark:hover:bg-dark-bg'}`}
                >
                  Todo el Contenido
                </button>
                <button
                  type="button"
                  onClick={handleSelectArea}
                  className={`-ml-px relative inline-flex items-center px-4 py-2 border text-sm font-medium ${options.exportType === 'selection' ? 'bg-brand-primary text-white border-brand-primary z-10' : 'border-gray-300 dark:border-gray-600 bg-light-card dark:bg-dark-card hover:bg-light-bg dark:hover:bg-dark-bg'}`}
                >
                  <SelectionIcon className="h-5 w-5 mr-2" />
                  Seleccionar Área
                </button>
              </div>
            </div>

            {/* Format */}
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Formato de Archivo</label>
              <select id="format" value={options.format} onChange={e => setOptions(prev => ({...prev, format: e.target.value as any}))} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md">
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            
            {/* Dimensions */}
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Tamaño (en píxeles)</label>
              <div className="flex items-center space-x-2">
                <input type="number" name="width" value={options.width} onChange={handleDimensionChange} min="1" className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md" />
                <span className="text-light-text-secondary dark:text-dark-text-secondary">×</span>
                <input type="number" name="height" value={options.height} onChange={handleDimensionChange} min="1" className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md" />
              </div>
            </div>

            {/* Background */}
            <div className="flex items-center">
              <input
                id="includeBackground"
                type="checkbox"
                checked={options.includeBackground}
                onChange={e => setOptions(prev => ({...prev, includeBackground: e.target.checked}))}
                className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
              />
              <label htmlFor="includeBackground" className="ml-2 block text-sm">
                Incluir fondo de cuadrícula
              </label>
            </div>
          </div>

          <div className="p-6 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">
              Exportar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportModal;