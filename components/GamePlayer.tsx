import React from 'react';

interface GamePlayerProps {
  onExit: () => void;
  gameTitle: string;
  gameUrl: string;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({ onExit, gameTitle, gameUrl }) => {
  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4 text-white" 
      role="dialog" 
      aria-modal="true" 
      aria-label={`Pantalla de juego de ${gameTitle}`}
    >
      <button
        onClick={onExit}
        className="absolute top-4 right-4 bg-orange-500 text-white text-lg font-bold py-2 px-6 rounded-lg border-2 border-orange-700 hover:bg-orange-400 transition-colors z-20 animate-pulse"
        style={{ fontFamily: "'Monaco', monospace" }}
        aria-label="Salir del juego"
      >
        SALIR
      </button>

      <div className="w-full max-w-4xl text-center mb-4">
        <h2 className="text-2xl font-bold mb-2">{gameTitle}</h2>
        <p className="text-gray-300">El emulador puede tardar un momento en cargar. ¡Ten paciencia!</p>
        <p className="text-sm text-gray-400">
          Haz clic dentro del juego para activar los controles.
        </p>
      </div>
      
      <div className="w-full h-[75vh] max-w-4xl">
        <iframe
          src={gameUrl}
          className="w-full h-full border-4 border-orange-500/50 rounded-lg bg-gray-900"
          title={`${gameTitle} Emulator from Minijuegos`}
          allow="fullscreen; gamepad; autoplay; cross-origin-isolated"
          sandbox="allow-scripts allow-same-origin"
        ></iframe>
      </div>
    </div>
  );
};
