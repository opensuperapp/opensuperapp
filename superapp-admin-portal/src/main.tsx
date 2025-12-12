import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./lib/auth-context";
import { CssBaseline } from "@mui/material";
// Config is now read by the custom AuthProvider via window.configs
import { ThemeProvider, NotificationProvider } from "./context";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <CssBaseline />
      <NotificationProvider>
  <AuthProvider>
          <App />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
);
