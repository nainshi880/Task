import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { firebaseMessagingSwPlugin } from "./vite.firebase-sw.js";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure VITE_FIREBASE_* are available when generating the messaging SW.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("VITE_FIREBASE_")) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react(), tailwindcss(), firebaseMessagingSwPlugin()],
  };
});
