import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in an ES Module-compatible way
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
            manifest: {
                name: 'MesaMagica PWA',
                short_name: 'MesaMagica',
                start_url: '/',
                display: 'standalone',
                theme_color: '#00A651',
                background_color: '#ffffff',
                icons: [
                    { src: 'logo192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'logo512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png}'],
                runtimeCaching: [
                    { urlPattern: /^https:\/\/mesamagica\.app\/images\/.*/i, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 } } },
                    { urlPattern: ({ url }) => url.pathname === '/api/menu/items', handler: 'CacheFirst', options: { cacheName: 'menu-items', expiration: { maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 } } },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
});