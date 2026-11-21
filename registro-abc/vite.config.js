import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// "host: true" permite abrir o app no celular, pela mesma rede Wi-Fi,
// durante o desenvolvimento (ver README).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
});
