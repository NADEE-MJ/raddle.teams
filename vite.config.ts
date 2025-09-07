import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    root: 'frontend',
    publicDir: 'public',
    build: {
        outDir: '../static',
        emptyOutDir: true,
        sourcemap: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './frontend/src'),
        },
    },
    server: {
        port: 8001,
        open: true,
        proxy: {
            '/api': 'http://localhost:8000',
            '/ws': {
                target: 'ws://localhost:8000',
                ws: true,
            },
        },
    },
});
