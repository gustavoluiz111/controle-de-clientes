import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/controle-de-clientes/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                produtos: resolve(__dirname, 'produtos.html'),
            },
        },
    },
});
