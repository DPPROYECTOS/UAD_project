import React, { useState } from 'react';
import Spinner from './Spinner';
import { InformationCircleIcon } from './Icons';
import LoginRecorder from './LoginRecorder';

interface LoginViewProps {
  onLogin: (email: string, password:string) => void;
  isLoading: boolean;
  error: string | null;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, isLoading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim()) {
      onLogin(email.trim(), password.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg p-4 animate-fade-in">
      <div className="w-full max-w-md p-8 space-y-6 bg-light-card dark:bg-dark-card rounded-xl shadow-lg border border-light-border dark:border-dark-border">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-brand-primary">
            Proyectos y Mejora
          </h1>
          <p className="mt-2 text-light-text-secondary dark:text-dark-text-secondary">Inicia sesión para acceder a tu panel.</p>
        </div>
        
        {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center" role="alert">
                <InformationCircleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="text-sm">{error}</span>
            </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="sr-only">
              Correo Electrónico
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full px-3 py-3 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg placeholder-light-text-secondary dark:placeholder-dark-text-secondary text-light-text dark:text-dark-text rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
              placeholder="Correo Electrónico"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="relative block w-full px-3 py-3 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg placeholder-light-text-secondary dark:placeholder-dark-text-secondary text-light-text dark:text-dark-text rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
              placeholder="Contraseña"
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-light-card dark:focus:ring-offset-dark-card focus:ring-brand-primary disabled:bg-brand-primary/50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <Spinner /> : 'Acceder'}
            </button>
          </div>
        </form>
      </div>
      <LoginRecorder />
    </div>
  );
};

export default LoginView;