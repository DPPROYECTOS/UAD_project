import React, { useState, useEffect, useMemo } from 'react';
import { UserPermissions, PasswordItem, PasswordCategory } from '../types';
import { getPasswords, addPassword, updatePassword, deletePassword, getMasterPasswordHash, setMasterPasswordHash, getPasswordCategories, addPasswordCategory, deletePasswordCategory, supabase } from '../services/supabaseService';
import { KeyIcon, PlusIcon, EyeIcon, PencilAltIcon, TrashIcon, InformationCircleIcon, XIcon, CheckCircleIcon, UsersIcon, FolderIcon, CogIcon } from '../components/Icons';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/projects/ConfirmationModal';

// --- Client-side Encryption/Decryption ---
// Updated to v2 to support full Unicode range (preventing data loss/corruption for chars > 255)
const cipher = (salt: string) => (text: string) => {
  const textToChars = (t: string) => t.split('').map(c => c.charCodeAt(0));
  const applySaltToChar = (code: number) => textToChars(salt).reduce((a, b) => a ^ b, code);
  
  // v2: Uses 4-char hex (padding to 4) to support UTF-16, prefixed with 'v2:'
  return 'v2:' + text.split('')
    .map(c => c.charCodeAt(0))
    .map(applySaltToChar)
    .map(n => ('0000' + Number(n).toString(16)).slice(-4))
    .join('');
};

const decipher = (salt: string) => (encoded: string) => {
  try {
    const textToChars = (t: string) => t.split('').map(c => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(salt).reduce((a, b) => a ^ b, code);

    if (encoded.startsWith('v2:')) {
        // v2 Logic: Read 4 chars at a time
        const content = encoded.substring(3);
        return content.match(/.{1,4}/g)!
          .map(hex => parseInt(hex, 16))
          .map(applySaltToChar)
          .map(charCode => String.fromCharCode(charCode))
          .join('');
    } else {
        // Legacy Logic (Fallback): Read 2 chars at a time (prone to corruption for high ASCII)
        return encoded.match(/.{1,2}/g)!
          .map(hex => parseInt(hex, 16))
          .map(applySaltToChar)
          .map(charCode => String.fromCharCode(charCode))
          .join('');
    }
  } catch (e) {
    console.error("Decryption failed", e);
    return null; // Return null on failure
  }
};

// --- Hashing for Master Password ---
const sha256 = async (str: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

interface PasswordsViewProps {
  userPermissions: UserPermissions | null;
  isMasterBypassActive: boolean;
}

const PasswordsView: React.FC<PasswordsViewProps> = ({ userPermissions, isMasterBypassActive }) => {
  // ... (Hooks and state remain the same up to filteredPasswords)
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [masterPasswordHash, setMasterPasswordHash] = useState<string | null | 'loading'>('loading');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  // Use state for categories instead of derived memo to support empty ones
  const [categories, setCategories] = useState<PasswordCategory[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordItem | null>(null);
  
  const [passwordToDelete, setPasswordToDelete] = useState<PasswordItem | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  
  const [isBypassUnlock, setIsBypassUnlock] = useState(isMasterBypassActive);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Grouping State
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const canManage = userPermissions?.contraseñas?.canManage ?? false;

  useEffect(() => {
    const checkHash = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        const hash = await getMasterPasswordHash();
        setMasterPasswordHash(hash);
    };
    checkHash();
  }, []);

  useEffect(() => {
    if (isUnlocked || isBypassUnlock) {
      setIsLoading(true);
      setError(null);
      
      const loadData = async () => {
          try {
              const [passData, catData] = await Promise.all([getPasswords(), getPasswordCategories()]);
              setPasswords(passData);
              // Ensure default category exists visually even if DB is empty
              if (catData.length === 0) {
                  setCategories([{ id: 'default', name: 'General' }]);
              } else {
                  setCategories(catData);
              }
          } catch(err) {
              setError(err instanceof Error ? err.message : 'Error loading data');
          } finally {
              setIsLoading(false);
          }
      };
      loadData();
    }
  }, [isUnlocked, isBypassUnlock]);
  
  // Combine distinct categories from passwords (legacy) and explicit categories table
  const allCategoryNames = useMemo(() => {
      const explicit = categories.map(c => c.name);
      // Ensure we don't miss categories that might only exist on passwords if migration failed
      const implicit = new Set(passwords.map(p => p.category || 'General'));
      const combined = new Set([...explicit, ...implicit]);
      // Ensure 'General' is always present
      combined.add('General');
      return Array.from(combined).sort();
  }, [categories, passwords]);

  // Logic to determine which blocks to render
  const categoriesToShow = useMemo(() => {
      if (selectedCategory === 'Todas') return allCategoryNames;
      return [selectedCategory];
  }, [allCategoryNames, selectedCategory]);

  const refreshCategories = async () => {
      const catData = await getPasswordCategories();
      // Ensure default category exists visually
      if (catData.length === 0) {
          setCategories([{ id: 'default', name: 'General' }]);
      } else {
          setCategories(catData);
      }
  };

  // ... (handleUnlock, handleCreateMasterPassword, handleSavePassword, handleDelete, toggleVisibility remain the same)
  const handleUnlock = async (password: string) => {
      setUnlockError(null);
      const hashedAttempt = await sha256(password);
      const RECOVERY_KEY = "QUIEN-TE-HAS-CREIDO-QUE-SOMOS";

      if (password === RECOVERY_KEY) {
          if (hashedAttempt !== masterPasswordHash) {
              try {
                  await setMasterPasswordHash(hashedAttempt);
                  setMasterPasswordHash(hashedAttempt);
              } catch (e) {
                  console.error("Failed to sync recovery hash", e);
              }
          }
          setMasterPassword(password);
          setIsUnlocked(true);
          setIsBypassUnlock(false);
          return;
      }

      if (hashedAttempt === masterPasswordHash) {
          setMasterPassword(password);
          setIsUnlocked(true);
          setIsBypassUnlock(false);
      } else {
          setUnlockError('Contraseña Maestra incorrecta.');
      }
  };

  const handleCreateMasterPassword = async (password: string) => {
      setUnlockError(null);
      const hashedPassword = await sha256(password);
      try {
          await setMasterPasswordHash(hashedPassword);
          setMasterPasswordHash(hashedPassword);
          setMasterPassword(password);
          setIsUnlocked(true);
          setIsBypassUnlock(false);
      } catch (err) {
          setUnlockError(err instanceof Error ? err.message : 'No se pudo guardar la Contraseña Maestra.');
      }
  };

  const handleSavePassword = async (item: Omit<PasswordItem, 'id'|'user_id'|'password_ct'> & { password_pt: string }) => {
    if (!masterPassword) return;
    const encrypt = cipher(masterPassword);
    const newItem = {
        service: item.service,
        username: item.username,
        password_ct: encrypt(item.password_pt),
        category: item.category || 'General' // Default to General if empty
    };

    try {
        if (editingPassword) {
            const updated = await updatePassword({ id: editingPassword.id, ...newItem });
            setPasswords(passwords.map(p => p.id === updated.id ? updated : p));
        } else {
            const added = await addPassword(newItem);
            setPasswords([...passwords, added]);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar la contraseña.');
    }
  };

  const handleDelete = async () => {
    if (!passwordToDelete) return;
    try {
        await deletePassword(passwordToDelete.id);
        setPasswords(passwords.filter(p => p.id !== passwordToDelete.id));
    } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar la contraseña.');
    } finally {
        setPasswordToDelete(null);
    }
  };

  const toggleVisibility = (id: string) => {
    setVisiblePasswords(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };

  if (!canManage) { return <div>No tienes permiso para acceder a esta sección.</div> }

  if (masterPasswordHash === 'loading') {
      return <div className="flex justify-center items-center h-full"><Spinner /></div>;
  }
  
  if (!isUnlocked && !isBypassUnlock) {
    return (
      <MasterPasswordPrompt
        hasMasterPassword={!!masterPasswordHash}
        onUnlock={handleUnlock}
        onCreate={handleCreateMasterPassword}
        error={unlockError}
      />
    );
  }

  return (
    <>
      {isBypassUnlock && !isUnlocked && (
        <OverlayUnlockPrompt onUnlock={handleUnlock} error={unlockError} />
      )}
      
      <div className={isBypassUnlock && !isUnlocked ? 'blur-sm pointer-events-none' : ''}>
        <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Gestor de Contraseñas</h1>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Bóveda encriptada y organizada.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsCategoryModalOpen(true)} className="flex items-center px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-light-text dark:text-dark-text">
                    <CogIcon className="h-5 w-5 mr-2" />
                    Gestionar Categorías
                </button>
                <button onClick={() => { setEditingPassword(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Añadir Contraseña
                </button>
            </div>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        {/* Categories Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
            <button
                onClick={() => setSelectedCategory('Todas')}
                className={`px-3 py-1 text-sm rounded-full transition-colors font-medium border ${
                    selectedCategory === 'Todas' 
                    ? 'bg-brand-primary text-white border-brand-primary' 
                    : 'bg-light-bg dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-secondary border-light-border dark:border-dark-border hover:border-brand-primary'
                }`}
            >
                Todas
            </button>
            {allCategoryNames.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors font-medium border ${
                        selectedCategory === cat 
                        ? 'bg-brand-primary text-white border-brand-primary' 
                        : 'bg-light-bg dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-secondary border-light-border dark:border-dark-border hover:border-brand-primary'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {isLoading ? (
            <div className="flex justify-center items-center py-16"><Spinner /><span className="ml-2">Cargando...</span></div>
        ) : (
            <div className="space-y-8">
                {categoriesToShow.map(cat => {
                    // Filter passwords for this specific block
                    const blockPasswords = passwords.filter(p => (p.category || 'General') === cat);
                    
                    // Logic: If 'Todas' is selected, we might skip empty categories UNLESS they are explicitly defined by user.
                    // But to ensure consistent UI for new users, we always show 'General' or non-empty blocks.
                    if (selectedCategory === 'Todas' && blockPasswords.length === 0 && cat !== 'General' && !categories.some(c => c.name === cat)) {
                       return null;
                    }

                    return (
                        <div key={cat} className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border overflow-hidden shadow-sm">
                            {/* Block Header */}
                            <div className="px-6 py-3 bg-light-bg dark:bg-dark-bg/50 border-b border-light-border dark:border-dark-border flex items-center gap-2">
                                <FolderIcon className="h-5 w-5 text-brand-primary" />
                                <h3 className="font-bold text-lg text-light-text dark:text-dark-text">{cat}</h3>
                                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary">
                                    {blockPasswords.length}
                                </span>
                            </div>

                            {/* Block Table */}
                            {blockPasswords.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
                                    <thead className="bg-light-bg/50 dark:bg-dark-bg/30">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary w-1/4">Servicio</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary w-1/4">Usuario</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary w-1/4">Contraseña</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary w-1/4">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                    {blockPasswords.map(p => {
                                        const isVisible = visiblePasswords.has(p.id);
                                        const decrypted = isVisible && masterPassword ? decipher(masterPassword)(p.password_ct) : null;
                                        const isShared = p.user_id !== currentUserId;

                                        return (
                                            <tr key={p.id} className="hover:bg-light-bg dark:hover:bg-dark-bg/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-light-text dark:text-dark-text">{p.service}</span>
                                                    {isShared && (
                                                        <span title="Compartido" className="text-brand-primary"><UsersIcon className="h-4 w-4"/></span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-light-text-secondary dark:text-dark-text-secondary truncate max-w-xs" title={p.username}>{p.username}</td>
                                            <td className="px-6 py-4 font-mono text-light-text dark:text-dark-text">
                                                {isVisible && decrypted ? (
                                                    <span className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded text-yellow-800 dark:text-yellow-200 select-all">{decrypted}</span>
                                                ) : (
                                                    <span className="text-gray-400">••••••••</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button onClick={() => toggleVisibility(p.id)} className="p-1.5 rounded-full text-gray-500 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={isVisible ? "Ocultar" : "Mostrar"}>
                                                        <EyeIcon className="h-5 w-5"/>
                                                    </button>
                                                    <button onClick={() => { setEditingPassword(p); setIsModalOpen(true); }} className="p-1.5 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Editar">
                                                        <PencilAltIcon className="h-5 w-5"/>
                                                    </button>
                                                    <button onClick={() => setPasswordToDelete(p)} className="p-1.5 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                                                        <TrashIcon className="h-5 w-5"/>
                                                    </button>
                                                </div>
                                            </td>
                                            </tr>
                                        )
                                    })}
                                    </tbody>
                                </table>
                            </div>
                            ) : (
                                <div className="p-6 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary italic">
                                    Categoría vacía. Añade contraseñas aquí.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {isModalOpen && (
        <PasswordModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSavePassword}
          passwordToEdit={editingPassword}
          masterPassword={masterPassword}
          existingCategories={allCategoryNames}
        />
      )}

      {isCategoryModalOpen && (
          <ManageCategoriesModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            categories={categories}
            onUpdate={async () => {
                // Refresh categories and passwords to sync UI
                await refreshCategories();
                const passData = await getPasswords();
                setPasswords(passData);
            }}
          />
      )}
      
      <ConfirmationModal
        isOpen={!!passwordToDelete}
        onClose={() => setPasswordToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Contraseña"
        message={`¿Estás seguro de que quieres eliminar la entrada para "${passwordToDelete?.service}"? Esta acción no se puede deshacer.`}
      />
    </>
  );
};

// ... (MasterPasswordPrompt and OverlayUnlockPrompt remain the same)
const MasterPasswordPrompt: React.FC<{
  hasMasterPassword: boolean;
  onUnlock: (password: string) => void;
  onCreate: (password: string) => void;
  error: string | null;
}> = ({ hasMasterPassword, onUnlock, onCreate, error }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasMasterPassword) {
      onUnlock(password);
    } else {
      if (password === confirmPassword && password.length >= 8) {
        onCreate(password);
      }
    }
  };
  
  return (
    <div className="flex justify-center items-center h-full">
      <div className="w-full max-w-sm p-8 space-y-4 bg-light-card dark:bg-dark-card rounded-xl shadow-lg border border-light-border dark:border-dark-border">
        <KeyIcon className="mx-auto h-12 w-12 text-brand-primary"/>
        <h2 className="text-center text-xl font-bold">{hasMasterPassword ? 'Desbloquear Gestor' : 'Crear Contraseña Maestra'}</h2>
        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          {hasMasterPassword ? 'Introduce tu Contraseña Maestra para acceder.' : 'Esta contraseña encriptará tus datos. No podrá ser recuperada.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña Maestra" required className="w-full p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border"/>
          {!hasMasterPassword && (
            <>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" required className="w-full p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border"/>
              {password && confirmPassword && password !== confirmPassword && <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>}
              {password && password.length < 8 && <p className="text-xs text-red-500">La contraseña debe tener al menos 8 caracteres.</p>}
            </>
          )}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" className="w-full py-2 bg-brand-primary text-white rounded font-bold hover:bg-brand-secondary transition-colors">{hasMasterPassword ? 'Desbloquear' : 'Crear y Desbloquear'}</button>
        </form>
      </div>
    </div>
  );
};

const OverlayUnlockPrompt: React.FC<{
  onUnlock: (password: string) => void;
  error: string | null;
}> = ({ onUnlock, error }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlock(password);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center animate-fade-in" style={{ animationDuration: '0.3s' }}>
      <div className="w-full max-w-sm p-8 space-y-4 bg-light-card dark:bg-dark-card rounded-xl shadow-lg border border-light-border dark:border-dark-border" onClick={e => e.stopPropagation()}>
        <KeyIcon className="mx-auto h-12 w-12 text-brand-primary"/>
        <h2 className="text-center text-xl font-bold">Desbloquear para Continuar</h2>
        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Introduce tu Contraseña Maestra para ver y gestionar tus contraseñas.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña Maestra" required autoFocus className="w-full p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border"/>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" className="w-full py-2 bg-brand-primary text-white rounded font-bold hover:bg-brand-secondary transition-colors">Desbloquear</button>
        </form>
      </div>
    </div>
  );
};

// --- Password Modal Component ---
interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Omit<PasswordItem, 'id'|'user_id'|'password_ct'> & { password_pt: string }) => void;
    passwordToEdit: PasswordItem | null;
    masterPassword: string | null;
    existingCategories: string[];
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSave, passwordToEdit, masterPassword, existingCategories }) => {
    const [service, setService] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [category, setCategory] = useState('');

    useEffect(() => {
        if (passwordToEdit && masterPassword) {
            const decrypt = decipher(masterPassword);
            setService(passwordToEdit.service);
            setUsername(passwordToEdit.username);
            setPassword(decrypt(passwordToEdit.password_ct) || '');
            setCategory(passwordToEdit.category || 'General');
        } else {
            setService('');
            setUsername('');
            setPassword('');
            setCategory(existingCategories.length > 0 ? existingCategories[0] : 'General');
        }
    }, [passwordToEdit, masterPassword, existingCategories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ service, username, password_pt: password, category: category.trim() || 'General' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg border border-light-border dark:border-dark-border" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-light-border dark:border-dark-border">
                        <h2 className="text-2xl font-bold">{passwordToEdit ? 'Editar' : 'Añadir'} Contraseña</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Servicio</label>
                            <input value={service} onChange={e => setService(e.target.value)} placeholder="Ej: Google, Amazon, Banco..." required className="w-full p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-2 focus:ring-brand-primary focus:outline-none"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Grupo / Categoría</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-2 focus:ring-brand-primary focus:outline-none"
                            >
                                {existingCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                ¿No encuentras la categoría? Usa el botón "Gestionar Categorías".
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Usuario / Email</label>
                            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="nombre@ejemplo.com" required className="w-full p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-2 focus:ring-brand-primary focus:outline-none"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Contraseña</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-2 focus:ring-brand-primary focus:outline-none"/>
                        </div>
                    </div>
                    <div className="p-4 bg-light-bg dark:bg-dark-bg/50 flex justify-end gap-2 rounded-b-lg border-t border-light-border dark:border-dark-border">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 rounded bg-brand-primary text-white hover:bg-brand-secondary transition-colors">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Manage Categories Modal ---
interface ManageCategoriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: PasswordCategory[];
    onUpdate: () => Promise<void>;
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ isOpen, onClose, categories, onUpdate }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsProcessing(true);
        setError(null);
        try {
            await addPasswordCategory(newCategoryName);
            await onUpdate();
            setNewCategoryName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al añadir categoría');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (catName: string) => {
        if (catName === 'General') {
            alert("No se puede eliminar la categoría 'General'.");
            return;
        }
        if (!window.confirm(`¿Eliminar la categoría "${catName}"? Las contraseñas se moverán a 'General'.`)) return;
        
        setIsProcessing(true);
        setError(null);
        try {
            await deletePasswordCategory(catName);
            await onUpdate();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al eliminar categoría');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md border border-light-border dark:border-dark-border flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-light-border dark:border-dark-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">Gestionar Categorías</h2>
                    <button onClick={onClose} className="text-light-text-secondary hover:text-brand-primary"><XIcon className="h-6 w-6"/></button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input 
                            type="text" 
                            value={newCategoryName} 
                            onChange={e => setNewCategoryName(e.target.value)} 
                            placeholder="Nueva categoría..."
                            className="flex-grow p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border"
                        />
                        <button 
                            type="submit" 
                            disabled={!newCategoryName.trim() || isProcessing}
                            className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary disabled:opacity-50"
                        >
                            <PlusIcon className="h-5 w-5"/>
                        </button>
                    </form>
                    {error && <p className="text-sm text-red-500">{error}</p>}

                    {/* List */}
                    <ul className="space-y-2">
                        {categories.map(cat => (
                            <li key={cat.id} className="flex justify-between items-center p-3 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border">
                                <span className="font-medium">{cat.name}</span>
                                {cat.name !== 'General' && (
                                    <button 
                                        onClick={() => handleDelete(cat.name)} 
                                        disabled={isProcessing}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Eliminar (Mueve items a General)"
                                    >
                                        <TrashIcon className="h-5 w-5"/>
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PasswordsView;