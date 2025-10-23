import React from 'react';

interface GamesViewProps {
    onEnterGame: (gameId: string) => void;
}

const GamesView: React.FC<GamesViewProps> = ({ onEnterGame }) => {
    return (
        <div>
            <h1 className="text-3xl font-bold">Sala de Juegos</h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                Una selección de juegos para relajarse.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    onClick={() => onEnterGame('doom')}
                    className="group relative bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm transition-all hover:shadow-lg hover:border-brand-accent cursor-pointer overflow-hidden"
                >
                    <div className="p-6">
                        <h3 className="font-bold text-lg text-light-text dark:text-dark-text group-hover:text-brand-primary">DOOM</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">El clásico shooter en primera persona.</p>
                    </div>
                </div>

                <div
                    onClick={() => onEnterGame('ctr')}
                    className="group relative bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm transition-all hover:shadow-lg hover:border-brand-accent cursor-pointer"
                >
                    <div className="p-6">
                        <h3 className="font-bold text-lg text-light-text dark:text-dark-text group-hover:text-brand-primary">CRASH TEAM RACING</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">El icónico juego de carreras de karts.</p>
                    </div>
                </div>

                <div
                    onClick={() => onEnterGame('cb1')}
                    className="group relative bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm transition-all hover:shadow-lg hover:border-brand-accent cursor-pointer"
                >
                    <div className="p-6">
                        <h3 className="font-bold text-lg text-light-text dark:text-dark-text group-hover:text-brand-primary">CRASH BANDICOOT 1</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">La aventura original de plataformas.</p>
                    </div>
                </div>
                
                <div
                    onClick={() => onEnterGame('bc')}
                    className="group relative bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm transition-all hover:shadow-lg hover:border-brand-accent cursor-pointer"
                >
                    <div className="p-6">
                        <h3 className="font-bold text-lg text-light-text dark:text-dark-text group-hover:text-brand-primary">BATTLE CITY</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">El clásico juego de tanques de NES.</p>
                    </div>
                </div>

                 <div
                    onClick={() => onEnterGame('msx')}
                    className="group relative bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm transition-all hover:shadow-lg hover:border-yellow-500 cursor-pointer"
                >
                    <div className="p-6">
                        <h3 className="font-bold text-lg text-light-text dark:text-dark-text group-hover:text-yellow-500">METAL SLUG X</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">Acción y disparos de la vieja escuela.</p>
                    </div>
                </div>

                {/* Placeholder for more games */}
                <div className="group relative bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border opacity-50">
                    <div className="p-6">
                        <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Próximamente...</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">Más juegos en camino.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamesView;