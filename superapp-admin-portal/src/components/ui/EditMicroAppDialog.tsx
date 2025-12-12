import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  IconButton,
  Chip,
  Paper,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import type { MicroApp } from "../../types/microapp.types";
import { microAppsService, apiService } from "../../services";
import { useNotification } from "../../context";

interface EditMicroAppDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: MicroApp) => void;
  microApp: MicroApp;
}

const EditMicroAppDialog = ({
  open,
  onClose,
  onSuccess,
  microApp,
}: EditMicroAppDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>();
  const [pendingIcon, setPendingIcon] = useState<File | undefined>();
  const { showNotification } = useNotification();

  // Extract existing allowed functions from configs
  const existingAllowedFunctions =
    microApp.configs?.find((c) => c.configKey === "allowedFunctions")?.configValue || [];

  const [formData, setFormData] = useState({
    name: microApp.name,
    description: microApp.description,
    promoText: microApp.promoText || "",
    isMandatory: microApp.isMandatory,
    iconUrl: microApp.iconUrl || "",
    roles: microApp.roles.map((r) => r.role),
    allowedFunctions: existingAllowedFunctions as string[],
  });

  const [newRole, setNewRole] = useState("");
  const [newFunction, setNewFunction] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setFormData({
      name: microApp.name,
      description: microApp.description,
      promoText: microApp.promoText || "",
      isMandatory: microApp.isMandatory,
      iconUrl: microApp.iconUrl || "",
      roles: microApp.roles.map((r) => r.role),
      allowedFunctions: existingAllowedFunctions as string[],
    });
    setNewRole("");
    setNewFunction("");
    setPendingIcon(undefined);
    setUploadProgress(undefined);
    setErrors({});
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddFunction = () => {
    if (newFunction.trim() && !formData.allowedFunctions.includes(newFunction.trim())) {
      setFormData((prev) => ({
        ...prev,
        allowedFunctions: [...prev.allowedFunctions, newFunction.trim()],
      }));
      setNewFunction("");
    }
  };

  const handleRemoveFunction = (func: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedFunctions: prev.allowedFunctions.filter((f) => f !== func),
    }));
  };

  const handleAddRole = () => {
    if (newRole.trim() && !formData.roles.includes(newRole.trim())) {
      setFormData((prev) => ({
        ...prev,
        roles: [...prev.roles, newRole.trim()],
      }));
      setNewRole("");
    }
  };

  const handleRemoveRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r !== role),
    }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      let finalIconUrl = formData.iconUrl;

      // Upload icon if pending
      if (pendingIcon) {
        showNotification("Uploading app icon...", "info");
        setUploadProgress(10);
        await new Promise((res) => setTimeout(res, 0));
        const result = await apiService.uploadFile(pendingIcon);
        finalIconUrl = result.url;
        setPendingIcon(undefined);
        showNotification("Icon uploaded successfully!", "success");
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(undefined), 800);
      }

      const updatedMicroApp: MicroApp = {
        ...microApp,
        name: formData.name,
        description: formData.description,
        promoText: formData.promoText,
        isMandatory: formData.isMandatory,
        iconUrl: finalIconUrl,
        roles: formData.roles.map((role) => ({ role })),
        configs: formData.allowedFunctions.length > 0
          ? [
              {
                configKey: "allowedFunctions",
                configValue: formData.allowedFunctions,
              },
            ]
          : undefined,
      };

  await microAppsService.upsert(updatedMicroApp);
      showNotification("Micro app updated successfully", "success");
      handleClose();
  onSuccess(updatedMicroApp);
    } catch (error) {
      console.error("Error updating micro app:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to update micro app",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Edit Micro App</Typography>
          <IconButton onClick={handleClose} size="small" disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="App ID"
            value={microApp.appId}
            disabled
            fullWidth
            helperText="App ID cannot be changed"
          />
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
            disabled={loading}
      inputProps={{ 'data-testid': 'edit-app-name' }}
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            error={!!errors.description}
            helperText={errors.description}
            multiline
            rows={3}
            fullWidth
            required
            disabled={loading}
      inputProps={{ 'data-testid': 'edit-app-description' }}
          />
          <TextField
            label="Promo Text"
            value={formData.promoText}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, promoText: e.target.value }))
            }
            fullWidth
            disabled={loading}
      inputProps={{ 'data-testid': 'edit-app-promo' }}
          />

          {/* Icon Upload Section */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              App Icon
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Upload a new icon to replace the current one (optional)
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={!!uploadProgress || loading}
              >
                {pendingIcon ? "Change Icon" : "Upload New Icon"}
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingIcon(file);
                      showNotification(`Icon selected: ${file.name}`, "info");
                    }
                  }}
                  data-testid="edit-app-upload-icon-input"
                />
              </Button>
              {pendingIcon && (
                <Chip
                  label={`Selected: ${pendingIcon.name}`}
                  color="info"
                  size="small"
                  onDelete={() => setPendingIcon(undefined)}
                />
              )}
            </Box>
            {uploadProgress !== undefined && (
              <>
                <LinearProgress
                  data-testid="edit-app-icon-progress"
                  variant="determinate"
                  value={uploadProgress}
                  sx={{ mt: 1 }}
                />
                <Typography
                  variant="caption"
                  sx={{ mt: 0.5, display: "block" }}
                  data-testid="edit-app-icon-uploading"
                >
                  Uploading icon...
                </Typography>
              </>
            )}
          </Paper>
          
          {/* Roles Section */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Roles
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Assign roles/groups that can access this micro-app
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <TextField
                label="Role/Group Name"
                placeholder="e.g., admin, employee"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRole();
                  }
                }}
                fullWidth
                size="small"
                disabled={loading}
                inputProps={{ "data-testid": "edit-app-role-input" }}
              />
              <IconButton
                color="primary"
                onClick={handleAddRole}
                disabled={!newRole.trim() || loading}
                data-testid="edit-app-add-role"
              >
                <AddIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {formData.roles.map((role) => (
                <Chip
                  key={role}
                  label={role}
                  onDelete={() => handleRemoveRole(role)}
                  color="primary"
                  variant="outlined"
                  size="small"
                  disabled={loading}
                />
              ))}
            </Box>
            {formData.roles.length === 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontStyle: "italic", display: "block", mt: 1 }}
              >
                No roles assigned. Add at least one role.
              </Typography>
            )}
          </Box>
          
          {/* Allowed Functions Section */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Capabilities
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Specify which bridge functions this micro-app can access
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <TextField
                label="Function Name"
                placeholder="e.g., requestToken, requestCamera"
                value={newFunction}
                onChange={(e) => setNewFunction(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddFunction();
                  }
                }}
                fullWidth
                size="small"
                disabled={loading}
                inputProps={{ "data-testid": "edit-app-function-input" }}
              />
              <IconButton
                color="secondary"
                onClick={handleAddFunction}
                disabled={!newFunction.trim() || loading}
                data-testid="edit-app-add-function"
              >
                <AddIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {formData.allowedFunctions.map((func) => (
                <Chip
                  key={func}
                  label={func}
                  onDelete={() => handleRemoveFunction(func)}
                  color="secondary"
                  variant="outlined"
                  size="small"
                  disabled={loading}
                />
              ))}
            </Box>
            {formData.allowedFunctions.length === 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontStyle: "italic", display: "block", mt: 1 }}
              >
                No functions specified. Micro-app cannot access any bridge functions.
              </Typography>
            )}
          </Box>
          <FormControlLabel
            control={
              <Switch
                data-testid="edit-app-mandatory"
                checked={formData.isMandatory === 1}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isMandatory: e.target.checked ? 1 : 0,
                  }))
                }
                disabled={loading}
              />
            }
            label="Mandatory App"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
  <Button variant="contained" onClick={handleSubmit} disabled={loading} data-testid="edit-app-update">
          {loading ? "Updating..." : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditMicroAppDialog;
