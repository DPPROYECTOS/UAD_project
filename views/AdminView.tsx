
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderOpenIcon, 
  DocumentTextIcon, 
  ClipboardListIcon, 
  LinkIcon,
  PencilAltIcon,
  GameControllerIcon,
  KeyIcon,
  ViewGridIcon,
  AcademicCapIcon,
  SparklesIcon,
  MicrophoneIcon
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

// Define permission groups outside to avoid re-creation
const PERMISSION_GROUPS = [
    {
        id: 'proyectos',
        title: 'Proyectos',
        icon: <FolderOpenIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canCreate', label: 'Crear Proyectos' },
            { id: 'canEdit', label: 'Editar Proyectos' },
            { id: 'canDelete', label: 'Eliminar Proyectos' },
            { id: 'canManageTasks', label: 'Gestionar Tareas' },
        ]
    },
    {
        id: 'proyectos_documentos',
        title: 'Documentos (Proyectos)',
        icon: <DocumentTextIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canUpload', label: 'Subir Documentos' },
            { id: 'canView', label: 'Visualizar Documentos' },
            { id: 'canDownload', label: 'Descargar Documentos' },
            { id: 'canDelete', label: 'Eliminar Documentos' },
        ]
    },
    {
        id: 'documentos',
        title: 'Documentos (General)',
        icon: <DocumentTextIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canUpload', label: 'Subir Documentos' },
            { id: 'canDownload', label: 'Descargar Documentos' },
            { id: 'canDelete', label: 'Eliminar Documentos' },
            { id: 'canManageFolders', label: 'Gestionar Carpetas' },
        ]
    },
    {
        id: 'auditorias',
        title: 'Auditorías',
        icon: <ClipboardListIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canManage', label: 'Puede Gestionar' },
        ]
    },
    {
        id: 'enlaces',
        title: 'Enlaces',
        icon: <LinkIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canCreateEdit', label: 'Crear y Editar' },
            { id: 'canDelete', label: 'Eliminar' },
        ]
    },
    {
        id: 'apps',
        title: 'Apps',
        icon: <ViewGridIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canView', label: 'Puede Ver' },
        ]
    },
    {
        id: 'nexus',
        title: 'NEXUS',
        icon: <AcademicCapIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canView', label: 'Puede Ver' },
        ]
    },
    {
        id: 'gemini',
        title: 'Gemini AI',
        icon: <SparklesIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canUse', label: 'Puede Usar' },
        ]
    },
    {
        id: 'pizarra',
        title: 'Pizarra',
        icon: <PencilAltIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canEdit', label: 'Puede Editar' },
        ]
    },
    {
        id: 'juegos',
        title: 'Juegos',
        icon: <GameControllerIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canUnlock', label: 'Puede Desbloquear' },
        ]
    },
    {
        id: 'contraseñas',
        title: 'Contraseñas',
        icon: <KeyIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'canManage', label: 'Puede Gestionar' },
        ]
    },
    // Adding Bitacora group mapped to sidebar permission for visual management
    {
        id: 'sidebar',
        title: 'Bitácora (Voz)',
        icon: <MicrophoneIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'bitacora', label: 'Acceso a Bitácora' },
        ]
    },
];

const AdminView: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allUserPermissions, setAllUserPermissions] = useState<Record<string, UserPermissions>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const defaultPermissions: UserPermissions = useMemo(() => ({
      sidebar: { dashboard: true, proyectos: true, documentos: true, enlaces: true, auditorias: true, pizarra: true, notificaciones: true, contraseñas: true, apps: true, nexus: true, bitacora: true },
      proyectos: { canCreate: true, canEdit: true, canDelete: true, canManageTasks: true },
      proyectos_documentos: { canUpload: true, canView: true, canDownload: true, canDelete: true },
      documentos: { canUpload: true, canDownload: true, canDelete: true, canManageFolders: true },
      enlaces: { canCreateEdit: true, canDelete: true },
      auditorias: { canManage: true },
      pizarra: { canEdit: true },
      juegos: { canUnlock: false },
      contraseñas: { canManage: true },
      apps: { canView: true },
      nexus: { canView: true },
      gemini: { canUse: false },
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
                if (lowerEmail === 'zerklucio@gmail.com') return 'ZERK LUCIO';
                return lowerEmail.split('@')[0].toUpperCase().replace('.', ' ');
            };

            const activeUsers = adminData
                .filter(u => u.email) // Ensure user has email
                .map(u => ({ id: u.id, email: u.email, nickname: getNickname(u.email) }));
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
                    juegos: { ...defaultPermissions.juegos, ...(user.permissions?.juegos || {}) },
                    contraseñas: { ...defaultPermissions.contraseñas, ...(user.permissions?.contraseñas || {}) },
                    apps: { ...defaultPermissions.apps, ...(user.permissions?.apps || {}) },
                    nexus: { ...defaultPermissions.nexus, ...(user.permissions?.nexus || {}) },
                    gemini: { ...defaultPermissions.gemini, ...(user.permissions?.gemini || {}) },
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
      } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
      } finally {
          setIsSaving(false);
      }
  };

  if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Spinner /><span className="ml-2">Cargando panel...</span></div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Panel de Administrador</h1>
      <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
        Gestiona los permisos de los usuarios para cada módulo de la aplicación.
      </p>
      
      {error && <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">{error}</div>}

      <div className="mt-6 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
            <div className="overflow-x-auto p-6">
                <div className="grid items-center gap-y-2 gap-x-4" style={{ gridTemplateColumns: `minmax(250px, 1.5fr) repeat(${users.length}, minmax(100px, 1fr))` }}>
                    <div className="font-semibold sticky left-0 bg-light-card dark:bg-dark-card py-2 z-10">Permisos \ Usuarios</div>
                    {users.map(user => (
                        <div key={user.id} className="text-center font-bold text-sm truncate p-2" title={user.email}>{user.nickname}</div>
                    ))}
                    
                    {PERMISSION_GROUPS.map(group => (
                        <React.Fragment key={group.id}>
                            <div className="col-span-full font-bold text-brand-primary pt-6 pb-2 flex items-center gap-2 border-b border-light-border dark:border-dark-border mb-2">
                                {group.icon}
                                {group.title}
                            </div>
                            {group.permissions.map(perm => (
                                <React.Fragment key={`${group.id}-${perm.id}`}>
                                    <div className="flex items-center p-2 text-sm rounded-md bg-light-bg dark:bg-dark-bg sticky left-0 z-10">
                                        <span title={perm.label}>{perm.label}</span>
                                    </div>
                                    {users.map(user => {
                                        // Safe access with optional chaining and fallback
                                        const userSection = allUserPermissions[user.id]?.[group.id as keyof UserPermissions];
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const isChecked = (userSection as any)?.[perm.id] ?? false;

                                        return (
                                            <div key={`${group.id}-${perm.id}-${user.id}`} className="flex justify-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="h-4 w-4 rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary cursor-pointer" 
                                                    checked={isChecked} 
                                                    onChange={(e) => handlePermissionChange(user.id, group.id as keyof UserPermissions, perm.id, e.target.checked)}
                                                />
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        
        <div className="p-4 border-t border-light-border dark:border-dark-border flex justify-end">
            <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-secondary disabled:bg-brand-primary/50 flex items-center"
            >
                {isSaving && <Spinner size="sm" />}
                <span className={isSaving ? "ml-2" : ""}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
