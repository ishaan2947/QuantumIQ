import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing dependencies into their own chunks.
        // Three.js in particular should never be re-downloaded because some
        // application code changed, and keeping it out of the entry chunk is
        // what lets the landing page paint without it.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
          markdown: ['react-markdown'],
        },
      },
    },
    // Three.js is legitimately ~950 kB and there is no trimming it meaningfully.
    // The default 500 kB warning is noise now that it sits in its own chunk
    // that only the Lab and the demo pull in, never the landing page's first
    // paint. Raised just above three's size so a genuinely new large chunk
    // still trips the warning.
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    host: true, // Needed for Docker container to be accessible from host
    proxy: {
      '/api': {
        // VITE_API_URL is set in docker-compose for container-to-container
        // routing. It is a dev-server-side value only — the browser-facing
        // origin used by production builds is VITE_PUBLIC_API_URL, read in
        // src/config/env.ts. Keep the two separate: this hostname does not
        // resolve outside the Docker network.
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
