import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 3000,
    proxy: {
      '/api': {
        target: import.meta.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
    // Temporarily disable lovable-tagger during troubleshooting
    // mode === 'development' && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
