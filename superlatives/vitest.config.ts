import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: [resolve(__dirname, './frontend/vitestSetup.ts')],
        globals: true,
        pool: 'vmThreads',
        poolOptions: {
            vmThreads: {
                singleThread: true,
            },
        },
        server: {
            deps: {
                inline: ['react-router', 'react-router/dom', 'react-router-dom'],
            },
        },
        deps: {
            optimizer: {
                web: {
                    include: ['react-router', 'react-router/dom', 'react-router-dom'],
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './frontend/src'),
        },
    },
});
