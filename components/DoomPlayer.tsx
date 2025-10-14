import React from 'react';

interface DoomPlayerProps {
  onExit: () => void;
}

export const DoomPlayer: React.FC<DoomPlayerProps> = ({ onExit }) => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Pantalla de juego de DOOM">
      <button
        onClick={onExit}
        className="absolute top-4 right-4 bg-red-700 text-white text-lg py-2 px-4 rounded border-2 border-red-900 hover:bg-red-600 transition-colors z-20 animate-pulse"
        style={{ fontFamily: "'VT323', monospace" }}
        aria-label="Salir del juego"
      >
        SALIR DEL JUEGO
      </button>
      <iframe
        src="https://silentspacemarine.com/"
        className="w-full h-full border-4 border-gray-700 rounded-lg z-10"
        title="DOOM Wasm"
        allowFullScreen
      ></iframe>
    </div>
  );
};
