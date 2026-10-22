import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // Caminhos relativos: funciona em https://<usuario>.github.io/<repo>/
  base: './',
  plugins: [vue(), tailwindcss()],
})
