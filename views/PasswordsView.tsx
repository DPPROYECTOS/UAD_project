import React, { useState, useEffect, useMemo } from 'react';
import { UserPermissions, PasswordItem } from '../types';
import { getPasswords, addPassword, updatePassword, deletePassword, getMasterPasswordHash, setMasterPasswordHash } from '../services/supabaseService';
import { KeyIcon, PlusIcon, EyeIcon, PencilAltIcon, TrashIcon, InformationCircleIcon, XIcon, CheckCircleIcon } from '../components/Icons';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/projects/ConfirmationModal';

// --- Client-side Encryption/Decryption ---
const cipher = (salt: string) => (text: string) => {
  const textToChars = (t: string) => t.split('').map(c => c.charCodeAt(0));
  const byteHex = (n: number) => ('0' + Number(n).toString(16)).substr(-2);
  const applySaltToChar = (code: number) => textToChars(salt).reduce((a, b) => a ^ b, code);
  return text.split('').map(c => c.charCodeAt(0)).map(applySaltToChar).map(byteHex).join('');
};

const decipher = (salt: string) => (encoded: string) => {
  try {
    const textToChars = (t: string) => t.split('').map(c => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(salt).reduce((a, b) => a ^ b, code);
    return encoded.match(/.{1,2}/g)!
      .map(hex => parseInt(hex, 16))
      .map(applySaltToChar)
      .map(charCode => String.fromCharCode(charCode))
      .join('');
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
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [masterPasswordHash, setMasterPasswordHash] = useState<string | null | 'loading'>('loading');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordItem | null>(null);
  
  const [passwordToDelete, setPasswordToDelete] = useState<PasswordItem | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isBypassUnlock, setIsBypassUnlock] = useState(isMasterBypassActive);

  const canManage = userPermissions?.contraseñas?.canManage ?? false;

  useEffect(() => {
    const checkHash = async () => {
        const hash = await getMasterPasswordHash();
        setMasterPasswordHash(hash);
    };
    checkHash();
  }, []);

  useEffect(() => {
    // Fetch passwords immediately if bypassed, or after unlocking
    if (isUnlocked || isBypassUnlock) {
      setIsLoading(true);
      setError(null);
      getPasswords()
          .then(setPasswords)
          .catch(err => setError(err.message))
          .finally(() => setIsLoading(false));
    }
  }, [isUnlocked, isBypassUnlock]);
  
  const handleUnlock = async (password: string) => {
      setUnlockError(null);
      const hashedAttempt = await sha256(password);
      if (hashedAttempt === masterPasswordHash) {
          setMasterPassword(password);
          setIsUnlocked(true);
          setIsBypassUnlock(false); // Clear bypass state on successful unlock
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
            <h1 className="text-3xl font-bold">Gestor de Contraseñas</h1>
            <button onClick={() => { setEditingPassword(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">
                <PlusIcon className="h-5 w-5 mr-2" />
                Añadir Contraseña
            </button>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
          {isLoading ? (
              <div className="flex justify-center items-center py-16"><Spinner /><span className="ml-2">Cargando...</span></div>
          ) : passwords.length === 0 ? (
              <div className="text-center py-16 text-light-text-secondary dark:text-dark-text-secondary">
                  <p>No hay contraseñas guardadas.</p>
              </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
                <thead><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">Servicio</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Usuario</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Contraseña</th><th className="px-6 py-3"></th></tr></thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                  {passwords.map(p => {
                      const isVisible = visiblePasswords.has(p.id);
                      const decrypted = isVisible && masterPassword ? decipher(masterPassword)(p.password_ct) : null;
                      return (
                        <tr key={p.id}>
                          <td className="px-6 py-4">{p.service}</td>
                          <td className="px-6 py-4">{p.username}</td>
                          <td className="px-6 py-4 font-mono">{isVisible && decrypted ? decrypted : '••••••••'}</td>
                          <td className="px-6 py-4 text-right">
                              <button onClick={() => toggleVisibility(p.id)}><EyeIcon className="h-5 w-5"/></button>
                              <button onClick={() => { setEditingPassword(p); setIsModalOpen(true); }}><PencilAltIcon className="h-5 w-5"/></button>
                              <button onClick={() => setPasswordToDelete(p)}><TrashIcon className="h-5 w-5"/></button>
                          </td>
                        </tr>
                      )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <PasswordModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSavePassword}
          passwordToEdit={editingPassword}
          masterPassword={masterPassword}
        />
      )}
      
      <ConfirmationModal
        isOpen={!!passwordToDelete}
        onClose={() => setPasswordToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Contraseña"
        message={`¿Estás seguro de que quieres eliminar la entrada para "${passwordToDelete?.service}"?`}
      />
    </>
  );
};


// --- Master Password Prompt Component ---
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
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña Maestra" required className="w-full p-2 border rounded"/>
          {!hasMasterPassword && (
            <>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" required className="w-full p-2 border rounded"/>
              {password && confirmPassword && password !== confirmPassword && <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>}
              {password && password.length < 8 && <p className="text-xs text-red-500">La contraseña debe tener al menos 8 caracteres.</p>}
            </>
          )}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" className="w-full py-2 bg-brand-primary text-white rounded">{hasMasterPassword ? 'Desbloquear' : 'Crear y Desbloquear'}</button>
        </form>
      </div>
    </div>
  );
};


// --- Overlay Unlock Prompt for Bypass Mode ---
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
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña Maestra" required autoFocus className="w-full p-2 border rounded"/>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" className="w-full py-2 bg-brand-primary text-white rounded">Desbloquear</button>
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
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSave, passwordToEdit, masterPassword }) => {
    const [service, setService] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (passwordToEdit && masterPassword) {
            const decrypt = decipher(masterPassword);
            setService(passwordToEdit.service);
            setUsername(passwordToEdit.username);
            setPassword(decrypt(passwordToEdit.password_ct) || '');
        } else {
            setService('');
            setUsername('');
            setPassword('');
        }
    }, [passwordToEdit, masterPassword]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ service, username, password_pt: password });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-light-border dark:border-dark-border">
                        <h2 className="text-2xl font-bold">{passwordToEdit ? 'Editar' : 'Añadir'} Contraseña</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <input value={service} onChange={e => setService(e.target.value)} placeholder="Servicio (ej. Google, Amazon)" required className="w-full p-2 border rounded"/>
                        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuario o Email" required className="w-full p-2 border rounded"/>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" required className="w-full p-2 border rounded"/>
                    </div>
                    <div className="p-4 bg-light-bg dark:bg-dark-bg/50 flex justify-end gap-2 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded border">Cancelar</button>
                        <button type="submit" className="px-4 py-2 rounded bg-brand-primary text-white">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default PasswordsView;