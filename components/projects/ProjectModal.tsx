import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '../../types';
import { XIcon, SparklesIcon } from '../Icons';
import Spinner from '../Spinner';
import { generateProjectIdeas } from '../../services/geminiService';


interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'> | Project) => void;
  projectToEdit?: Project | null;
  geminiApiKey: string | null;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, projectToEdit, geminiApiKey }) => {
  const [formData, setFormData] = useState<Omit<Project, 'id'>>({
    name: '',
    description: '',
    objective: '',
    status: ProjectStatus.NUEVO,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    team: [],
    leader: '',
  });
  const [teamInput, setTeamInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (projectToEdit) {
      setFormData(projectToEdit);
    } else {
      // Reset form for new project
      setFormData({
        name: '', description: '', objective: '', status: ProjectStatus.NUEVO,
        startDate: new Date().toISOString().split('T')[0], endDate: '', team: [], leader: ''
      });
    }
    setAiPrompt('');
    setAiError(null);
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTeamAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && teamInput.trim()) {
      e.preventDefault();
      if (!formData.team.includes(teamInput.trim())) {
        setFormData(prev => ({ ...prev, team: [...prev.team, teamInput.trim()] }));
      }
      setTeamInput('');
    }
  };

  const handleTeamRemove = (memberToRemove: string) => {
    setFormData(prev => ({ ...prev, team: prev.team.filter(member => member !== memberToRemove) }));
  };

  const handleGenerateWithAI = async () => {
    if (!geminiApiKey) {
        setAiError("La clave de API de Gemini no está disponible. Contacta al administrador.");
        return;
    }
    setIsGenerating(true);
    setAiError(null);
    try {
      const result = await generateProjectIdeas(aiPrompt, geminiApiKey);
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        team: Array.isArray(result.team) ? [...prev.team, ...result.team].filter((v, i, a) => a.indexOf(v) === i) : prev.team
      }));
    } catch (error) {
        setAiError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(projectToEdit ? { ...formData, id: projectToEdit.id } : formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-light-border dark:border-dark-border">
            <h2 className="text-2xl font-bold">{projectToEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {!projectToEdit && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
                <h3 className="font-semibold flex items-center"><SparklesIcon className="h-5 w-5 mr-2 text-blue-500" /> Asistente de Ideas de Proyectos</h3>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ej: Optimizar el proceso de empaque en el almacén..."
                  className="w-full h-20 p-2 text-sm border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"
                  disabled={isGenerating || !geminiApiKey}
                />
                {!geminiApiKey && <p className="text-xs text-yellow-600 dark:text-yellow-400">La función de IA no está configurada por el administrador.</p>}
                 {aiError && <p className="text-sm text-red-500">{aiError}</p>}
                <button type="button" onClick={handleGenerateWithAI} disabled={!aiPrompt || isGenerating || !geminiApiKey} className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">
                  {isGenerating ? <><Spinner /> <span className="ml-2">Generando...</span></> : <>Generar con IA</>}
                </button>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Nombre del Proyecto</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <textarea name="description" value={formData.description} onChange={handleChange} required rows={3} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"></textarea>
            </div>
            <div>
              <label className="text-sm font-medium">Objetivo del Proyecto</label>
              <textarea name="objective" value={formData.objective} onChange={handleChange} required rows={2} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <label className="text-sm font-medium">Líder del Proyecto</label>
                <input type="text" name="leader" value={formData.leader} onChange={handleChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de Inicio</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de Fin</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
              </div>
            </div>

             <div>
                <label className="text-sm font-medium">Equipo</label>
                <div className="mt-1">
                    <input 
                        type="text" 
                        value={teamInput} 
                        onChange={e => setTeamInput(e.target.value)}
                        onKeyDown={handleTeamAdd}
                        placeholder="Escribe un nombre y presiona Enter"
                        className="w-full p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"
                    />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {formData.team.map(member => (
                        <div key={member} className="flex items-center bg-brand-accent/20 text-brand-secondary dark:text-brand-accent rounded-full px-3 py-1 text-sm">
                            <span>{member}</span>
                            <button type="button" onClick={() => handleTeamRemove(member)} className="ml-2 text-brand-secondary dark:text-brand-accent hover:text-red-500">
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
             </div>
          </div>

          <div className="p-6 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;