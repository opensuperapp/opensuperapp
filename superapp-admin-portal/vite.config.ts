import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import istanbul from 'vite-plugin-istanbul';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    istanbul({
      cypress: true,
      requireEnv: false,
      include: ['src/**/*'],
      exclude: ['node_modules', 'cypress', 'test', 'tests'],
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:9090",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
