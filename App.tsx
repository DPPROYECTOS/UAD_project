import React from 'react';
import GeminiView from './views/GeminiView';

const App: React.FC = () => {
    // Determine the theme from localStorage or system preference and apply it to the <html> element
    React.useEffect(() => {
        const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        if (theme === 'dark') {
            document.documentElement.classList.add('theme-dark');
        } else {
            document.documentElement.classList.remove('theme-dark');
        }
    }, []);

    return (
        <main className="p-4 sm:p-6 lg:p-8 font-sans text-light-text dark:text-dark-text">
            <div className="max-w-7xl mx-auto">
                <GeminiView />
            </div>
        </main>
    );
};

export default App;
