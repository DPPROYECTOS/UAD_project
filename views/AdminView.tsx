import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderOpenIcon, 
  DocumentTextIcon, 
  ClipboardListIcon, 
  LinkIcon,
  PencilAltIcon,
  SparklesIcon,
  GameControllerIcon
} from '../components/Icons';
// Fix: Import UserPermissions from ../types
import { getAdminData, savePermissionsForUser } from '../services/supabaseService';
import { UserPermissions } from '../types';
import Spinner from '../components/Spinner';

interface AdminUser {
    id: string;
    email: string;
    nickname: string;
}

const projectPermissions = [
    { id: 'canCreate', label: 'Crear Proyectos' },
    { id: 'canEdit', label: 'Editar Proyectos' },
    { id: 'canDelete', label: 'Eliminar Proyectos' },
    { id: 'canManageTasks', label: 'Gestionar Tareas' },
];

const projectDocsPermissions = [
    { id: 'canUpload', label: 'Subir Documentos' },
    { id: 'canView', label: 'Visualizar Documentos' },
    { id: 'canDownload', label: 'Descargar Documentos' },
    { id: 'canDelete', label: 'Eliminar Documentos' },
];

const documentosPermissions = [
    { id: 'canUpload', label: 'Subir Documentos' },
    { id: 'canDownload', label: 'Descargar Documentos' },
    { id: 'canDelete', label: 'Eliminar Documentos' },
    { id: 'canManageFolders', label: 'Gestionar Carpetas' },
];

const enlacesPermissions = [
    { id: 'canCreateEdit', label: 'Crear y Editar' },
    { id: 'canDelete', label: 'Eliminar' },
];

const auditoriasPermissions = [
    { id: 'canManage', label: 'Puede Gestionar' },
];

const pizarraPermissions = [
    { id: 'canEdit', label: 'Puede Editar' },
];

const geminiPermissions = [
    { id: 'canUse', label: 'Usar Gemini' },
];

const juegosPermissions = [
    { id: 'canUnlock', label: 'Puede Desbloquear' },
];


const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('proyectos');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allUserPermissions, setAllUserPermissions] = useState<Record<string, UserPermissions>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const defaultPermissions: UserPermissions = useMemo(() => ({
      sidebar: { dashboard: true, proyectos: true, documentos: true, enlaces: true, gemini: true, auditorias: true, pizarra: true, notificaciones: true },
      proyectos: { canCreate: true, canEdit: true, canDelete: true, canManageTasks: true },
      proyectos_documentos: { canUpload: true, canView: true, canDownload: true, canDelete: true },
      documentos: { canUpload: true, canDownload: true, canDelete: true, canManageFolders: true },
      enlaces: { canCreateEdit: true, canDelete: true },
      auditorias: { canManage: true },
      pizarra: { canEdit: true },
      gemini: { canUse: true },
      juegos: { canUnlock: false },
  }), []);

  useEffect(() => {
    const fetchAdminData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const adminData = await getAdminData();
            
            const getNickname = (email: string): string => {
                const lowerEmail = (email || '').toLowerCase();
                if (lowerEmail === 'darienperez695@gmail.com') return 'PHOBOS';
                if (lowerEmail === 'mejoraproyectos0@gmail.com') return 'ZERK LUCIO';
                return lowerEmail.split('@')[0].toUpperCase().replace('.', ' ');
            };

            const activeUsers = adminData.map(u => ({ id: u.id, email: u.email, nickname: getNickname(u.email) }));
            setUsers(activeUsers);
            
            const populatedPermissions: Record<string, UserPermissions> = {};
            adminData.forEach(user => {
                // Deep merge defaults with fetched permissions to ensure all keys exist
                populatedPermissions[user.id] = {
                    sidebar: { ...defaultPermissions.sidebar, ...(user.permissions?.sidebar || {}) },
                    proyectos: { ...defaultPermissions.proyectos, ...(user.permissions?.proyectos || {}) },
                    proyectos_documentos: { ...defaultPermissions.proyectos_documentos, ...(user.permissions?.proyectos_documentos || {}) },
                    documentos: { ...defaultPermissions.documentos, ...(user.permissions?.documentos || {}) },
                    enlaces: { ...defaultPermissions.enlaces, ...(user.permissions?.enlaces || {}) },
                    auditorias: { ...defaultPermissions.auditorias, ...(user.permissions?.auditorias || {}) },
                    pizarra: { ...defaultPermissions.pizarra, ...(user.permissions?.pizarra || {}) },
                    gemini: { ...defaultPermissions.gemini, ...(user.permissions?.gemini || {}) },
                    juegos: { ...defaultPermissions.juegos, ...(user.permissions?.juegos || {}) },
                };
            });
            setAllUserPermissions(populatedPermissions);

        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudieron cargar los datos de administrador.");
        } finally {
            setIsLoading(false);
        }
    };
    fetchAdminData();
  }, [defaultPermissions]);

  const handlePermissionChange = (userId: string, section: keyof UserPermissions, permissionId: string, isChecked: boolean) => {
      setAllUserPermissions(prev => {
          const userPerms = prev[userId] || defaultPermissions;
          return {
              ...prev,
              [userId]: {
                  ...userPerms,
                  [section]: {
                      ...(userPerms[section] as any),
                      [permissionId]: isChecked,
                  }
              }
          };
      });
  };

  const handleSaveChanges = async () => {
      setIsSaving(true);
      setError(null);
      try {
          // Save permissions for each user one by one
          for (const user of users) {
              await savePermissionsForUser(user.id, allUserPermissions[user.id]);
          }
          // Optionally show a success toast/message here
      } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Panel de Administrador</h1>
      <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
        Gestiona los permisos de los usuarios para cada módulo de la aplicación.
      </p>
      
      {error && <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">{error}</div>}

      {/* This is a single page view, not tabbed */}
      <div className="mt-6 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
        {isLoading ? (
            <div className="flex justify-center items-center py-16"><Spinner /><span className="ml-2">Cargando permisos...</span></div>
        ) : (
            <div className="overflow-x-auto p-6">
                <div className="grid items-center gap-y-2 gap-x-4" style={{ gridTemplateColumns: `minmax(250px, 1.5fr) repeat(${users.length}, minmax(100px, 1fr))` }}>
                    <div className="font-semibold sticky left-0 bg-light-card dark:bg-dark-card py-2">Permisos \ Usuarios</div>
                    {users.map(user => (
                        <div key={user.id} className="text-center font-bold text-sm truncate p-2" title={user.email}>{user.nickname}</div>
                    ))}
                    
                    {/* Project Permissions */}
                    <div className="col-span-full font-bold text-brand-primary pt-4 pb-2 flex items-center gap-2"><FolderOpenIcon className="h-5 w-5"/>Proyectos</div>
                    {projectPermissions.map(perm => (
                        <React.Fragment key={`proj-${perm.id}`}>
                            <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0"><span title={perm.label}>{perm.label}</span></div>
                            {users.map(user => (
                                <div key={`${perm.id}-${user.id}`} className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary" checked={allUserPermissions[user.id]?.proyectos?.[perm.id as keyof UserPermissions['proyectos']] ?? false} onChange={(e) => handlePermissionChange(user.id, 'proyectos', perm.id, e.target.checked)}/></div>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Project Documents Permissions */}
                    <div className="col-span-full font-bold text-brand-primary pt-4 pb-2 flex items-center gap-2"><DocumentTextIcon className="h-5 w-5"/>Documentos (dentro de Proyectos)</div>
                    {projectDocsPermissions.map(perm => (
                        <React.Fragment key={`proj-doc-${perm.id}`}>
                            <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0"><span title={perm.label}>{perm.label}</span></div>
                            {users.map(user => (
                                <div key={`${perm.id}-${user.id}`} className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary" checked={allUserPermissions[user.id]?.proyectos_documentos?.[perm.id as keyof UserPermissions['proyectos_documentos']] ?? false} onChange={(e) => handlePermissionChange(user.id, 'proyectos_documentos', perm.id, e.target.checked)} /></div>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* General Documents Permissions */}
                    <div className="col-span-full font-bold text-brand-primary pt-4 pb-2 flex items-center gap-2"><DocumentTextIcon className="h-5 w-5"/>Documentos (General)</div>
                    {documentosPermissions.map(perm => (
                        <React.Fragment key={`doc-${perm.id}`}>
                            <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0"><span title={perm.label}>{perm.label}</span></div>
                            {users.map(user => (
                                <div key={`${perm.id}-${user.id}`} className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary" checked={allUserPermissions[user.id]?.documentos?.[perm.id as keyof UserPermissions['documentos']] ?? false} onChange={(e) => handlePermissionChange(user.id, 'documentos', perm.id, e.target.checked)} /></div>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Audits Permissions */}
                    <div className="col-span-full font-bold text-brand-primary pt-4 pb-2 flex items-center gap-2"><ClipboardListIcon className="h-5 w-5"/>Auditorías</div>
                    {auditoriasPermissions.map(perm => (
                        <React.Fragment key={`audit-${perm.id}`}>
                            <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0"><span title={perm.label}>{perm.label}</span></div>
                            {users.map(user => (
                                <div key={`${perm.id}-${user.id}`} className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary" checked={allUserPermissions[user.id]?.auditorias?.[perm.id as keyof UserPermissions['auditorias']] ?? false} onChange={(e) => handlePermissionChange(user.id, 'auditorias', perm.id, e.target.checked)} /></div>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Enlaces Permissions */}
                    <div className="col-span-full font-bold text-brand-primary pt-4 pb-2 flex items-center gap-2"><LinkIcon className="h-5 w-5"/>Enlaces</div>
                    {enlacesPermissions.map(perm => (
                        <React.Fragment key={`link-${perm.id}`}>
                            <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0"><span title={perm.label}>{perm.label}</span></div>
                            {users.map(user => (
                                <div key={`${perm.id}-${user.id}`} className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary" checked={allUserPermissions[user.id]?.enlaces?.[perm.id as keyof UserPermissions['enlaces']] ?? false} onChange={(e) => handlePermissionChange(user.id, 'enlaces', perm.id, e.target.checked)} /></div>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Pizarra Permissions */}
                    <div className="col-span-full font-bold text-brand-primary pt-4 pb-2 flex items-center gap-2"><PencilAltIcon className="h-5 w-5"/>Pizarra</div>
                    {pizarraPermissions.map(perm => (
                        <React.Fragment key={`pizarra-${perm.id}`}>
                            <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0"><span title={perm.label}>{perm.label}</span></div>
                            {users.map(user => (
                                <div key={`${perm.id}-${user.id}`} className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary" checked={allUserPermissions[user.id]?.pizarra?.[perm.id as keyof UserPermissions['pizarra']] ?? false} onChange={(e) => handlePermissionChange(user.id, 'pizarra', perm.id, e.target.checked)} /></div>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Gemini Permissions */}
                    <div className="col-span-full font-bold text-brand-primary pt-4 pb-2 flex items-center gap-2"><SparklesIcon className="h-5 w-5"/>Gemini</div>
                    {geminiPermissions.map(perm => (
                        <React.Fragment key={`gemini-${perm.id}`}>
                            <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0"><span title={perm.label}>{perm.label}</span></div>
                            {users.map(user => (
                                <div key={`${perm.id}-${user.id}`} className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary" checked={allUserPermissions[user.id]?.gemini?.[perm.id as keyof UserPermissions['gemini']] ?? false} onChange={(e) => handlePermissionChange(user.id, 'gemini', perm.id, e.target.checked)} /></div>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Juegos Permissions */}
                    <div className="col-span-full font-bold text-brand-primary pt-4 pb-2 flex items-center gap-2"><GameControllerIcon className="h-5 w-5"/>Juegos</div>
                    {juegosPermissions.map(perm => (
                        <React.Fragment key={`juegos-${perm.id}`}>
                            <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0"><span title={perm.label}>{perm.label}</span></div>
                            {users.map(user => (
                                <div key={`${perm.id}-${user.id}`} className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary" checked={allUserPermissions[user.id]?.juegos?.[perm.id as keyof UserPermissions['juegos']] ?? false} onChange={(e) => handlePermissionChange(user.id, 'juegos', perm.id, e.target.checked)} /></div>
                            ))}
                        </React.Fragment>
                    ))}

                </div>
            </div>
        )}
        <div className="p-4 border-t border-light-border dark:border-dark-border flex justify-end">
            <button
                onClick={handleSaveChanges}
                disabled={isLoading || isSaving}
                className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-secondary disabled:bg-brand-primary/50"
            >
                {isSaving ? <Spinner /> : 'Guardar Cambios'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdminView;