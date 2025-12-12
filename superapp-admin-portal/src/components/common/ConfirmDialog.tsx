import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { useEffect, useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?:
    | "error"
    | "primary"
    | "secondary"
    | "success"
    | "info"
    | "warning";
}

const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "primary",
}: ConfirmDialogProps) => {
  // Keep the last non-empty message to prevent flickering during close animation
  const [displayMessage, setDisplayMessage] = useState(message);
  const [displayTitle, setDisplayTitle] = useState(title);

  useEffect(() => {
    if (open && message) {
      setDisplayMessage(message);
      setDisplayTitle(title);
    }
  }, [open, message, title]);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{displayTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {displayMessage}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
