/**
 * Notification Context
 *
 * Provides a simple notification system for displaying messages.
 */

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface NotificationContextType {
  showNotification: (
    message: string,
    severity?: "success" | "error" | "info" | "warning",
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

interface NotificationState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
}

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: "",
    severity: "info",
  });

  const showNotification = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "info",
  ) => {
    setNotification({ open: true, message, severity });
  };

  const handleClose = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleClose}
      />
    </NotificationContext.Provider>
  );
};

// Notification Component
import { Snackbar, Alert } from "@mui/material";

interface NotificationProps {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
  onClose: () => void;
}

function Notification({ open, message, severity, onClose }: NotificationProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
