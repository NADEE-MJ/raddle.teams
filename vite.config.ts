import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    root: '.',
    publicDir: 'frontend/public',
    build: {
        outDir: 'static',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        host: true,
    },
});
