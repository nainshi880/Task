import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import "./index.css";
import App from "./App.jsx";
import { queryClient } from "./lib/queryClient";
import AuthBootstrap from "./components/auth/AuthBootstrap";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <App />
          <Toaster position="top-right" />
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
