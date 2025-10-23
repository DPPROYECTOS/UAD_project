import React, { useState } from 'react';
import { XIcon } from './Icons';

interface SecretCodeModalProps {
  onClose: () => void;
  onSubmit: (code: string) => boolean; // Returns true on success
}

const SecretCodeModal: React.FC<SecretCodeModalProps> = ({ onClose, onSubmit }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    if (/^\d*$/.test(value)) {
      setCode(value);
      setError(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onSubmit(code);
    if (!success) {
      setError(true);
      setCode('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-dark-card p-6 rounded-lg shadow-xl text-white w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h3 className="text-xl font-bold text-center">Código de Acceso</h3>
          <input
            type="password" // Use password type to hide input
            value={code}
            onChange={handleChange}
            autoFocus
            className={`w-full mt-4 p-4 text-center text-3xl tracking-[0.5em] bg-dark-bg border-2 rounded-md outline-none focus:ring-2 focus:ring-brand-primary ${error ? 'border-red-500 animate-shake' : 'border-dark-border'}`}
            style={{ fontFamily: 'monospace' }}
          />
          {error && <p className="text-red-500 text-sm text-center mt-2">Código Incorrecto</p>}
          <button type="submit" className="w-full mt-6 bg-brand-primary py-3 rounded-lg font-bold hover:bg-brand-secondary">DESBLOQUEAR</button>
        </form>
      </div>
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-shake { animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
};

export default SecretCodeModal;
