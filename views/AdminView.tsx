
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
  EyeIcon,
  CheckCircleIcon,
  LogoutIcon
} from '../components/Icons';
import { 
  getAdminData, 
  savePermissionsForUser, 
  getDeleteLocks, 
  updateDeleteLock, 
  supabase, 
  adminChangeUserPassword, 
  adminRevokeUserSessions, 
  adminRevokeAllSessions,
  adminGetActiveSessions,
  adminRevokeSession,
  ActiveSession,
  adminBroadcastSessionRevocation
} from '../services/supabaseService';
import { UserPermissions } from '../types';
import Spinner from '../components/Spinner';

interface AdminUser {
    id: string;
    email: string;
    nickname: string;
}

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
        id: 'sidebar', // Using sidebar id for codex access toggle
        title: 'CODEX', // RENAMED FROM NEXUS
        icon: <AcademicCapIcon className="h-5 w-5"/>,
        permissions: [
            { id: 'codex', label: 'Acceso a CODEX' },
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
    }
];

const AdminView: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allUserPermissions, setAllUserPermissions] = useState<Record<string, UserPermissions>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [deleteLocks, setDeleteLocks] = useState<Record<string, boolean>>({});

  // Password administration states
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [pwdChangeError, setPwdChangeError] = useState<string | null>(null);
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState<string | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState<boolean>(false);
  const [showSqlInstructions, setShowSqlInstructions] = useState<boolean>(false);
  const [confirmPwdChange, setConfirmPwdChange] = useState<boolean>(false);
  
  // Session administration states
  const [sessionUserId, setSessionUserId] = useState<string>('');
  const [confirmRevokeUser, setConfirmRevokeUser] = useState<boolean>(false);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState<boolean>(false);
  const [sessionRevokeError, setSessionRevokeError] = useState<string | null>(null);
  const [sessionRevokeSuccess, setSessionRevokeSuccess] = useState<string | null>(null);
  const [isRevokingSession, setIsRevokingSession] = useState<boolean>(false);
  const [showSessionSqlInstructions, setShowSessionSqlInstructions] = useState<boolean>(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [activeSessionsError, setActiveSessionsError] = useState<string | null>(null);
  
  const defaultPermissions: UserPermissions = useMemo(() => ({
      sidebar: { dashboard: true, proyectos: true, documentos: true, enlaces: true, auditorias: true, pizarra: true, notificaciones: true, contraseñas: true, apps: true, codex: true },
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
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserEmail(user.email || null);
            }

            const locks = await getDeleteLocks();
            setDeleteLocks(locks);

            const adminData = await getAdminData();
            
            const getNickname = (email: string): string => {
                const lowerEmail = (email || '').toLowerCase();
                if (lowerEmail === 'darienperez695@gmail.com') return 'PHOBOS';
                if (lowerEmail === 'mejoraproyectos0@gmail.com') return 'ZERK LUCIO';
                if (lowerEmail === 'zerklucio@gmail.com') return 'ZERK LUCIO';
                return lowerEmail.split('@')[0].toUpperCase().replace('.', ' ');
            };

            const activeUsers = adminData
                .filter(u => u.email) 
                .map(u => ({ id: u.id, email: u.email, nickname: getNickname(u.email) }));
            setUsers(activeUsers);
            
            const populatedPermissions: Record<string, UserPermissions> = {};
            adminData.forEach(user => {
                populatedPermissions[user.id] = {
                    sidebar: { ...defaultPermissions.sidebar, ...(user.permissions?.sidebar || {}), codex: user.permissions?.sidebar?.codex ?? user.permissions?.sidebar?.nexus ?? defaultPermissions.sidebar.codex },
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

  const fetchSessions = async () => {
      setIsLoadingSessions(true);
      setActiveSessionsError(null);
      try {
          const sessions = await adminGetActiveSessions();
          setActiveSessions(sessions);
      } catch (err) {
          console.warn("Could not load active sessions:", err);
          setActiveSessionsError(
              err instanceof Error 
                  ? `${err.message}. Asegúrate de haber ejecutado todo el script de la sección "Ver Instrucciones SQL de Sesiones" abajo en tu editor SQL de Supabase.`
                  : "No se pudieron obtener las sesiones activas de la base de datos."
          );
      } finally {
          setIsLoadingSessions(false);
      }
  };

  useEffect(() => {
      if (currentUserEmail?.trim().toLowerCase() === 'darienperez695@gmail.com') {
          fetchSessions();
      }
  }, [currentUserEmail]);

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
          for (const user of users) {
              await savePermissionsForUser(user.id, allUserPermissions[user.id]);
          }
      } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleToggleLock = async (optionId: string) => {
      const nextLocked = !deleteLocks[optionId];
      try {
          await updateDeleteLock(optionId, nextLocked);
          setDeleteLocks(prev => ({ ...prev, [optionId]: nextLocked }));
      } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo cambiar el estado del bloqueo maestro.");
      }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUserId) {
          setPwdChangeError("Por favor, selecciona un usuario.");
          return;
      }
      if (!newPassword.trim() || newPassword.length < 6) {
          setPwdChangeError("La contraseña debe tener al menos 6 caracteres.");
          return;
      }

      const selectedUser = users.find(u => u.id === selectedUserId);
      if (!selectedUser) {
          setPwdChangeError("Usuario no encontrado.");
          return;
      }

      if (!confirmPwdChange) {
          setPwdChangeError("Por favor, confirma marcando la casilla abajo.");
          return;
      }

      setIsChangingPwd(true);
      setPwdChangeError(null);
      setPwdChangeSuccess(null);

      try {
          await adminChangeUserPassword(selectedUserId, newPassword);
          setPwdChangeSuccess(`Contraseña de ${selectedUser.nickname} actualizada exitosamente.`);
          setNewPassword('');
          setConfirmPwdChange(false);
      } catch (err) {
          console.error(err);
          setPwdChangeError(
              err instanceof Error 
                  ? `${err.message}. Asegúrate de haber creado la función RPC 'admin_change_user_password' en tu consola de Supabase.`
                  : "No se pudo cambiar la contraseña. Verifica la configuración de Supabase."
          );
      } finally {
          setIsChangingPwd(false);
      }
  };

  const handleRevokeUserSessions = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!sessionUserId) {
          setSessionRevokeError("Por favor, selecciona un usuario.");
          return;
      }

      const selectedUser = users.find(u => u.id === sessionUserId);
      if (!selectedUser) {
          setSessionRevokeError("Usuario no encontrado.");
          return;
      }

      if (!confirmRevokeUser) {
          setSessionRevokeError("Por favor, confirma marcando la casilla abajo.");
          return;
      }

      setIsRevokingSession(true);
      setSessionRevokeError(null);
      setSessionRevokeSuccess(null);

      try {
          await adminRevokeUserSessions(sessionUserId);
          try {
              await adminBroadcastSessionRevocation('user', sessionUserId);
          } catch (broadcastErr) {
              console.warn("Realtime broadcast failed, fallback polling will handle it:", broadcastErr);
          }
          setSessionRevokeSuccess(`Sesión de ${selectedUser.nickname} (${selectedUser.email}) cerrada en todos los dispositivos.`);
          setConfirmRevokeUser(false);
          setSessionUserId('');
          await fetchSessions();
      } catch (err) {
          console.error(err);
          setSessionRevokeError(
              err instanceof Error 
                  ? `${err.message}. Asegúrate de haber creado la función RPC 'admin_revoke_user_sessions' en tu consola de Supabase.`
                  : "No se pudo cerrar la sesión de la cuenta. Verifica la configuración de Supabase."
          );
      } finally {
          setIsRevokingSession(false);
      }
  };

  const handleRevokeIndividualSession = async (sessionId: string) => {
      setIsRevokingSession(true);
      setSessionRevokeError(null);
      setSessionRevokeSuccess(null);

      try {
          await adminRevokeSession(sessionId);
          try {
              await adminBroadcastSessionRevocation('session', sessionId);
          } catch (broadcastErr) {
              console.warn("Realtime broadcast failed, fallback polling will handle it:", broadcastErr);
          }
          setSessionRevokeSuccess("Sesión específica revocada con éxito.");
          await fetchSessions();
      } catch (err) {
          console.error(err);
          setSessionRevokeError(
              err instanceof Error 
                  ? `${err.message}. Asegúrate de haber creado la función RPC 'admin_revoke_session' en tu consola de Supabase.`
                  : "No se pudo cerrar la sesión específica. Verifica la configuración de Supabase."
          );
      } finally {
          setIsRevokingSession(false);
      }
  };

  const handleRevokeAllSessions = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!confirmRevokeAll) {
          setSessionRevokeError("Por favor, confirma marcando la casilla de revocación global.");
          return;
      }

      setIsRevokingSession(true);
      setSessionRevokeError(null);
      setSessionRevokeSuccess(null);

      try {
          await adminRevokeAllSessions();
          try {
              await adminBroadcastSessionRevocation('all', '');
          } catch (broadcastErr) {
              console.warn("Realtime broadcast failed, fallback polling will handle it:", broadcastErr);
          }
          setSessionRevokeSuccess("Todas las sesiones activas de todos los usuarios han sido cerradas globalmente.");
          setConfirmRevokeAll(false);
          await fetchSessions();
      } catch (err) {
          console.error(err);
          setSessionRevokeError(
              err instanceof Error 
                  ? `${err.message}. Asegúrate de haber creado la función RPC 'admin_revoke_all_sessions' en tu consola de Supabase.`
                  : "No se pudo cerrar las sesiones. Verifica la configuración de Supabase."
          );
      } finally {
          setIsRevokingSession(false);
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
                                        const userSection = allUserPermissions[user.id]?.[group.id as keyof UserPermissions];
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

      {currentUserEmail?.trim().toLowerCase() === 'darienperez695@gmail.com' && (
        <div className="mt-8 p-6 bg-red-500/5 dark:bg-red-500/10 rounded-xl border border-red-500/20 shadow-md">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <KeyIcon className="h-6 w-6" />
                CONTROL MAESTRO DE ELIMINACIÓN (Solo PHOBOS)
            </h2>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                Bloquea o desbloquea el botón "Eliminar" de cada sección para todos los usuarios. (Tú siempre tendrás acceso a eliminar).
            </p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { id: 'proyectos', label: 'Proyectos', description: 'Bloquea la eliminación de proyectos.' },
                    { id: 'tareas', label: 'Tareas', description: 'Bloquea la eliminación de tareas.' },
                    { id: 'documentos', label: 'Documentos', description: 'Bloquea la eliminación de archivos/carpetas.' },
                    { id: 'enlaces', label: 'Enlaces', description: 'Bloquea la eliminación de enlaces.' },
                    { id: 'auditorias', label: 'Auditorías', description: 'Bloquea la eliminación de auditorías.' },
                    { id: 'pizarra', label: 'Pizarras', description: 'Bloquea la eliminación de pizarras.' },
                    { id: 'contraseñas', label: 'Contraseñas', description: 'Bloquea la eliminación de contraseñas.' }
                ].map(opt => {
                    const isLocked = !!deleteLocks[opt.id];
                    return (
                        <div key={opt.id} className="p-4 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <span className="font-bold text-sm block text-light-text dark:text-dark-text">{opt.label}</span>
                                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1 block">{opt.description}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggleLock(opt.id)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLocked ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isLocked ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {currentUserEmail?.trim().toLowerCase() === 'darienperez695@gmail.com' && (
        <>
          <div className="mt-8 p-6 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-xl border border-brand-primary/20 shadow-md">
            <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                <KeyIcon className="h-6 w-6" />
                GESTIÓN DE CONTRASEÑAS DE USUARIOS (Solo PHOBOS)
            </h2>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                Cambia directamente la contraseña de acceso para cualquiera de los usuarios registrados en Supabase.
            </p>

            <form onSubmit={handlePasswordChange} className="mt-6 space-y-4 max-w-xl">
                <div>
                    <label className="block text-sm font-semibold mb-1">Seleccionar Usuario</label>
                    <select
                        value={selectedUserId}
                        onChange={(e) => {
                            setSelectedUserId(e.target.value);
                            setConfirmPwdChange(false);
                            setPwdChangeError(null);
                            setPwdChangeSuccess(null);
                        }}
                        required
                        className="w-full p-2.5 border rounded-lg bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm text-light-text dark:text-dark-text"
                    >
                        <option value="">-- Selecciona un usuario --</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.nickname} ({u.email})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-1">Nueva Contraseña</label>
                    <div className="relative">
                        <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                setPwdChangeError(null);
                                setPwdChangeSuccess(null);
                            }}
                            placeholder="Mínimo 6 caracteres"
                            required
                            className="w-full p-2.5 pr-10 border rounded-lg bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm text-light-text dark:text-dark-text"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary transition-colors"
                        >
                            <EyeIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {selectedUserId && (
                    <div className="flex items-center gap-2 p-3.5 bg-yellow-500/5 dark:bg-yellow-500/10 border border-yellow-500/20 rounded-lg animate-fade-in">
                        <input
                            type="checkbox"
                            id="confirmPwdChangeCheckbox"
                            checked={confirmPwdChange}
                            onChange={(e) => {
                                setConfirmPwdChange(e.target.checked);
                                setPwdChangeError(null);
                            }}
                            className="rounded border-light-border dark:border-dark-border text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="confirmPwdChangeCheckbox" className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 cursor-pointer select-none">
                            Confirmo que deseo cambiar la contraseña para {users.find(u => u.id === selectedUserId)?.nickname || "este usuario"}.
                        </label>
                    </div>
                )}

                {pwdChangeError && (
                    <div className="p-3.5 text-xs font-semibold text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {pwdChangeError}
                    </div>
                )}

                {pwdChangeSuccess && (
                    <div className="p-3.5 text-xs font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                        {pwdChangeSuccess}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isChangingPwd || !confirmPwdChange || !newPassword || newPassword.length < 6}
                        className="px-5 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        title={!confirmPwdChange ? "Debe confirmar marcando la casilla" : "Actualizar Contraseña"}
                    >
                        {isChangingPwd && <Spinner size="sm" className="mr-2" />}
                        {isChangingPwd ? "Cambiando..." : "Actualizar Contraseña"}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowSqlInstructions(!showSqlInstructions)}
                        className="px-4 py-2.5 text-xs font-medium border border-light-border dark:border-dark-border rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-text-secondary dark:text-dark-text-secondary transition-colors"
                    >
                        {showSqlInstructions ? "Ocultar SQL" : "Ver Instrucciones SQL"}
                    </button>
                </div>
            </form>

            {showSqlInstructions && (
                <div className="mt-6 p-4 bg-light-bg dark:bg-dark-bg/50 border border-light-border dark:border-dark-border rounded-lg text-xs font-mono space-y-2 max-w-2xl animate-fade-in">
                    <p className="font-sans font-semibold text-light-text dark:text-dark-text mb-2 text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ ATENCIÓN: Para que este cambio funcione, debes ejecutar esta función en el SQL Editor de tu consola de Supabase una sola vez:
                    </p>
                    <pre className="p-3 bg-light-card dark:bg-dark-card rounded border border-light-border dark:border-dark-border overflow-x-auto text-[11px] text-light-text dark:text-dark-text select-all">
{`CREATE OR REPLACE FUNCTION admin_change_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;`}
                    </pre>
                    <p className="font-sans text-light-text-secondary dark:text-dark-text-secondary mt-2">
                        Esta función tiene habilitada la opción <code className="bg-light-card dark:bg-dark-card px-1 py-0.5 rounded border border-light-border dark:border-dark-border font-semibold">SECURITY DEFINER</code> para poder actualizar la contraseña en el esquema privado <code className="bg-light-card dark:bg-dark-card px-1 py-0.5 rounded border border-light-border dark:border-dark-border font-semibold">auth</code> de Supabase con seguridad.
                    </p>
                </div>
            )}
        </div>

        <div className="mt-8 p-6 bg-red-500/5 dark:bg-red-500/10 rounded-xl border border-red-500/20 shadow-md">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <LogoutIcon className="h-6 w-6" />
                CIERRE DE SESIÓN GLOBAL / REVOCACIÓN DE DISPOSITIVOS (Solo PHOBOS)
            </h2>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                Revoca al instante las sesiones activas de cualquier dispositivo. Los usuarios afectados serán desconectados inmediatamente.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* OPCION 1: UN USUARIO */}
                <form onSubmit={handleRevokeUserSessions} className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
                        Opción A: Cerrar Sesión de un Usuario
                    </h3>
                    
                    <div>
                        <label className="block text-xs font-semibold mb-1">Seleccionar Usuario</label>
                        <select
                            value={sessionUserId}
                            onChange={(e) => {
                                setSessionUserId(e.target.value);
                                setConfirmRevokeUser(false);
                                setSessionRevokeError(null);
                                setSessionRevokeSuccess(null);
                            }}
                            className="w-full p-2.5 border rounded-lg bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border focus:ring-2 focus:ring-red-500 focus:outline-none text-sm text-light-text dark:text-dark-text"
                        >
                            <option value="">-- Selecciona un usuario --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.nickname} ({u.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {sessionUserId && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg animate-fade-in">
                            <input
                                type="checkbox"
                                id="confirmRevokeUserCheckbox"
                                checked={confirmRevokeUser}
                                onChange={(e) => {
                                    setConfirmRevokeUser(e.target.checked);
                                    setSessionRevokeError(null);
                                }}
                                className="rounded border-light-border dark:border-dark-border text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
                            />
                            <label htmlFor="confirmRevokeUserCheckbox" className="text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer select-none">
                                Confirmo que deseo forzar el cierre de todas las sesiones activas de {users.find(u => u.id === sessionUserId)?.nickname}.
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isRevokingSession || !confirmRevokeUser || !sessionUserId}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isRevokingSession && <Spinner size="sm" className="mr-2" />}
                        Cerrar Sesiones de Usuario
                    </button>
                </form>

                {/* OPCION 2: TODOS LOS USUARIOS */}
                <form onSubmit={handleRevokeAllSessions} className="space-y-4 border-t md:border-t-0 md:border-l border-light-border dark:border-dark-border pt-6 md:pt-0 md:pl-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
                        Opción B: Cerrar Sesión de TODOS los Usuarios
                    </h3>
                    
                    <p className="text-xs text-red-500 font-semibold">
                        ⚠️ ¡ADVERTENCIA CRÍTICA! Esta acción cerrará de forma inmediata las sesiones de todos los usuarios registrados en el sistema, incluyéndote a ti. Todos deberán volver a iniciar sesión.
                    </p>

                    <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <input
                            type="checkbox"
                            id="confirmRevokeAllCheckbox"
                            checked={confirmRevokeAll}
                            onChange={(e) => {
                                setConfirmRevokeAll(e.target.checked);
                                setSessionRevokeError(null);
                            }}
                            className="rounded border-light-border dark:border-dark-border text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="confirmRevokeAllCheckbox" className="text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer select-none">
                            Confirmo que deseo cerrar las sesiones de absolutamente TODOS los usuarios en el sistema.
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isRevokingSession || !confirmRevokeAll}
                        className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isRevokingSession && <Spinner size="sm" className="mr-2" />}
                        Cerrar TODAS las Sesiones Globalmente
                    </button>
                </form>
            </div>

            {/* STATUS NOTIFICATIONS */}
            <div className="mt-4 space-y-2">
                {sessionRevokeError && (
                    <div className="p-3.5 text-xs font-semibold text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {sessionRevokeError}
                    </div>
                )}

                {sessionRevokeSuccess && (
                    <div className="p-3.5 text-xs font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                        {sessionRevokeSuccess}
                    </div>
                )}
            </div>

            {/* LISTA DE SESIONES ACTIVAS */}
            <div className="mt-8 pt-6 border-t border-light-border dark:border-dark-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                        <h3 className="text-base font-bold text-light-text dark:text-dark-text flex items-center gap-2">
                            <EyeIcon className="h-5 w-5 text-red-500 shrink-0" />
                            Dispositivos / Sesiones Activas Registradas ({activeSessions.length})
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                            Lista de todas las cookies/tokens activos en tiempo real para todos los usuarios.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchSessions()}
                        className="self-start sm:self-center px-3 py-1.5 bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border text-xs font-semibold rounded-lg hover:bg-light-card dark:hover:bg-dark-card transition-colors flex items-center gap-1.5 text-light-text-secondary dark:text-dark-text-secondary"
                    >
                        {isLoadingSessions && <Spinner size="sm" />}
                        Actualizar Lista
                    </button>
                </div>
                
                {activeSessionsError && (
                    <div className="p-3.5 mb-4 text-xs font-semibold text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {activeSessionsError}
                    </div>
                )}

                {isLoadingSessions ? (
                    <div className="flex justify-center items-center py-8">
                        <Spinner size="md" />
                        <span className="ml-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">Cargando sesiones...</span>
                    </div>
                ) : activeSessions.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-light-border dark:border-dark-border rounded-lg bg-light-bg/20 dark:bg-dark-bg/10">
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary italic">
                            No se encontraron sesiones o necesitas ejecutar los comandos SQL abajo para habilitar la consulta.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-light-border dark:border-dark-border bg-light-card/40 dark:bg-dark-card/30">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-light-bg dark:bg-dark-bg/50 text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border font-semibold">
                                    <th className="p-3">Usuario</th>
                                    <th className="p-3">Dirección IP</th>
                                    <th className="p-3">Navegador / Sistema</th>
                                    <th className="p-3">Fecha de Creación</th>
                                    <th className="p-3 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                {activeSessions.map((session) => {
                                    const getNicknameLocal = (email: string): string => {
                                        const lowerEmail = (email || '').toLowerCase();
                                        if (lowerEmail === 'darienperez695@gmail.com') return 'PHOBOS';
                                        if (lowerEmail === 'mejoraproyectos0@gmail.com') return 'ZERK LUCIO';
                                        if (lowerEmail === 'zerklucio@gmail.com') return 'ZERK LUCIO';
                                        return lowerEmail.split('@')[0].toUpperCase().replace('.', ' ');
                                    };

                                    const userNickname = session.nickname || getNicknameLocal(session.email || '');

                                    const parseUA = (ua: string) => {
                                        if (!ua) return "Navegador Desconocido";
                                        if (ua.includes("CriOS") || (ua.includes("Chrome") && !ua.includes("Edg"))) return "Google Chrome";
                                        if (ua.includes("Firefox") && !ua.includes("Seamonkey")) return "Mozilla Firefox";
                                        if (ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium")) return "Safari";
                                        if (ua.includes("Edg")) return "Microsoft Edge";
                                        if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
                                        return ua.substring(0, 40) + (ua.length > 40 ? "..." : "");
                                    };

                                    return (
                                        <tr key={session.session_id} className="hover:bg-light-bg/30 dark:hover:bg-dark-bg/10 transition-colors">
                                            <td className="p-3">
                                                <div className="font-bold text-light-text dark:text-dark-text">{userNickname}</div>
                                                <div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium">{session.email || "Sin email"}</div>
                                            </td>
                                            <td className="p-3 font-mono text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                                                {session.ip || "Desconocida/Local"}
                                            </td>
                                            <td className="p-3 text-light-text-secondary dark:text-dark-text-secondary truncate max-w-xs" title={session.user_agent}>
                                                {parseUA(session.user_agent)}
                                            </td>
                                            <td className="p-3 text-light-text-secondary dark:text-dark-text-secondary font-medium">
                                                {new Date(session.created_at).toLocaleString('es-ES', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm(`¿Cerrar sesión de este dispositivo de ${userNickname}? El usuario se desconectará de inmediato.`)) {
                                                            handleRevokeIndividualSession(session.session_id);
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white rounded-md text-[11px] font-bold transition-colors border border-red-500/20 shadow-sm"
                                                >
                                                    Desconectar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SQL EXPLANATION */}
            <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border">
                <button
                    type="button"
                    onClick={() => setShowSessionSqlInstructions(!showSessionSqlInstructions)}
                    className="px-4 py-2.5 text-xs font-medium border border-light-border dark:border-dark-border rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-text-secondary dark:text-dark-text-secondary transition-colors"
                >
                    {showSessionSqlInstructions ? "Ocultar SQL" : "Ver Instrucciones SQL de Sesiones"}
                </button>

                {showSessionSqlInstructions && (
                    <div className="mt-4 p-4 bg-light-bg dark:bg-dark-bg/50 border border-light-border dark:border-dark-border rounded-lg text-xs font-mono space-y-2 max-w-2xl animate-fade-in">
                        <p className="font-sans font-semibold text-light-text dark:text-dark-text mb-2 text-sm text-yellow-600 dark:text-yellow-400">
                            ⚠️ ATENCIÓN: Para que todas las opciones de control de sesiones funcionen, copia y ejecuta todo este script en el SQL Editor de tu consola de Supabase una sola vez:
                        </p>
                        <pre className="p-3 bg-light-card dark:bg-dark-card rounded border border-light-border dark:border-dark-border overflow-x-auto text-[11px] text-light-text dark:text-dark-text select-all">
{`CREATE OR REPLACE FUNCTION admin_get_active_sessions()
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_agent TEXT,
  ip TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS session_id,
    s.user_id,
    u.email::TEXT AS email,
    s.created_at,
    s.updated_at,
    s.user_agent::TEXT,
    s.ip::TEXT AS ip
  FROM auth.sessions s
  LEFT JOIN auth.users u ON s.user_id = u.id
  ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION check_session_valid(target_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.sessions WHERE id = target_session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_revoke_session(target_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.sessions
  WHERE id = target_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_revoke_user_sessions(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.sessions
  WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_revoke_all_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.sessions;
END;
$$;`}
                        </pre>
                        <p className="font-sans text-light-text-secondary dark:text-dark-text-secondary mt-2">
                            Estas funciones permiten consultar y eliminar las filas correspondientes de la tabla privada <code className="bg-light-card dark:bg-dark-card px-1 py-0.5 rounded border border-light-border dark:border-dark-border font-semibold">auth.sessions</code>, lo que invalida de inmediato todas las cookies de sesión y tokens de refresco de Supabase para los usuarios afectados en cualquier dispositivo.
                        </p>
                    </div>
                )}
            </div>
        </div>
        </>
      )}
    </div>
  );
};

export default AdminView;
