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
        port: 8101,
        open: true,
        host: '0.0.0.0',
        proxy: {
            '/api': 'http://localhost:8100',
            '/ws': {
                target: 'ws://localhost:8100',
                ws: true,
            },
        },
    },
});
