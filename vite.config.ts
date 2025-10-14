import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/UAD_project/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          // Tell vite to ignore these imports, they are handled by the importmap
          external: [
            "react",
            "react-dom",
            "react-dom/",
            "@google/genai",
            "@supabase/supabase-js",
            "uuid",
            "jspdf",
            "pptxgenjs",
          ],
        },
      },
    };
});
