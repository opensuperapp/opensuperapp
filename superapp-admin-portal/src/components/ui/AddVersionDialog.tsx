import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  IconButton,
  Paper,
  Chip,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import type { MicroApp } from "../../types/microapp.types";
import { microAppsService, apiService } from "../../services";
import { useNotification } from "../../context";
import { validateZipFile } from "../../utils";
import { isDev } from "../../utils/env";

interface AddVersionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  microApp: MicroApp;
}

const AddVersionDialog = ({
  open,
  onClose,
  onSuccess,
  microApp,
}: AddVersionDialogProps) => {
  // Only bypass uploads in E2E if both e2e-auth=1 and e2e-bypass-uploads=1 are set
  const bypass =
    typeof window !== "undefined" &&
    isDev() &&
    window.localStorage?.getItem("e2e-auth") === "1" &&
    window.localStorage?.getItem("e2e-bypass-uploads") === "1";
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>();
  const [pendingFile, setPendingFile] = useState<File | undefined>();
  const { showNotification } = useNotification();

  // Calculate next available build number
  const getNextBuildNumber = () => {
    if (!microApp.versions || microApp.versions.length === 0) return 1;
    const maxBuild = Math.max(...microApp.versions.map((v) => v.build));
    return maxBuild + 1;
  };

  const [formData, setFormData] = useState({
    version: "",
    build: getNextBuildNumber(),
    releaseNotes: "",
    downloadUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setFormData({
      version: "",
      build: getNextBuildNumber(),
      releaseNotes: "",
      downloadUrl: "",
    });
    setPendingFile(undefined);
    setUploadProgress(undefined);
    setErrors({});
    onClose();
  };

  const handleFileSelect = async (file: File | null) => {
    if (file) {
      // Validate the ZIP file unless running in bypass mode
      if (!bypass) {
        const validation = await validateZipFile(file);
        if (!validation.valid) {
          showNotification(validation.error || "Invalid file", "error");
          setPendingFile(undefined);
          return;
        }
      }

      setPendingFile(file);
      showNotification(`Package selected: ${file.name}`, "info");
    } else {
      setPendingFile(undefined);
      setFormData((prev) => ({ ...prev, downloadUrl: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.version.trim()) newErrors.version = "Version is required";
    if (!formData.releaseNotes.trim())
      newErrors.releaseNotes = "Release notes are required";
    if (!formData.downloadUrl && !pendingFile)
      newErrors.downloadUrl = "App package (ZIP) is required";

    // Check if build number already exists (build is the unique identifier)
    const buildExists = microApp.versions?.some(
      (v) => v.build === formData.build,
    );
    if (buildExists) {
      newErrors.build = `Build ${formData.build} already exists. Please use a different build number.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      let finalDownloadUrl = formData.downloadUrl;

      // Upload file if pending
      if (pendingFile) {
        showNotification("Uploading app package...", "info");
        // Show progress while uploading and yield a tick so UI can render it
        setUploadProgress(10);
        await new Promise((res) => setTimeout(res, 0));
        const result = await apiService.uploadFile(pendingFile);
        finalDownloadUrl = result.url;
        setPendingFile(undefined);
        showNotification("Package uploaded successfully!", "success");
  setUploadProgress(100);
  // Clear progress shortly after completion
  setTimeout(() => setUploadProgress(undefined), 800);
      }

      // Add new version using the dedicated endpoint
      const newVersion = {
        version: formData.version,
        build: formData.build,
        releaseNotes: formData.releaseNotes,
        iconUrl: microApp.iconUrl,
        downloadUrl: finalDownloadUrl,
      };

      await microAppsService.addVersion(microApp.appId, newVersion);
      showNotification("New version added successfully", "success");
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error adding version:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to add version",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Add New Version</Typography>
          <IconButton onClick={handleClose} size="small" disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2, mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Adding new version to: <strong>{microApp.name}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            App ID: {microApp.appId}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Version"
            placeholder="1.0.0"
            value={formData.version}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, version: e.target.value }))
            }
            error={!!errors.version}
            helperText={errors.version || "Semantic version (e.g., 1.0.0)"}
            fullWidth
            required
            disabled={loading}
            inputProps={{ 'data-testid': 'add-version-version' }}
          />

          <TextField
            label="Build Number"
            type="number"
            value={formData.build}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                build: parseInt(e.target.value) || 1,
              }))
            }
            fullWidth
            disabled={loading}
            inputProps={{ 'data-testid': 'add-version-build' }}
          />

          <TextField
            label="Release Notes"
            placeholder="What's new in this version?"
            value={formData.releaseNotes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, releaseNotes: e.target.value }))
            }
            error={!!errors.releaseNotes}
            helperText={errors.releaseNotes}
            multiline
            rows={3}
            fullWidth
            required
            disabled={loading}
            inputProps={{ 'data-testid': 'add-version-release-notes' }}
          />

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              App Package (ZIP) *
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Upload the ZIP file containing the app bundle
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={!!uploadProgress || loading}
              >
                Upload ZIP
                <input
                  type="file"
                  hidden
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleFileSelect(file || null);
                  }}
                  data-testid="add-version-upload-zip-input"
                />
              </Button>
              {pendingFile && !formData.downloadUrl && (
                <Chip
                  label={`Selected: ${pendingFile.name}`}
                  color="info"
                  size="small"
                  onDelete={() => handleFileSelect(null)}
                />
              )}
              {formData.downloadUrl && (
                <Chip
                  label="Uploaded"
                  color="success"
                  size="small"
                  onDelete={() => {
                    setFormData((prev) => ({ ...prev, downloadUrl: "" }));
                    setPendingFile(undefined);
                  }}
                />
              )}
            </Box>
            {(uploadProgress !== undefined || (loading && pendingFile)) && (
              <>
                <LinearProgress
                  data-testid="add-version-progress"
                  variant={uploadProgress !== undefined ? "determinate" : "indeterminate"}
                  value={uploadProgress ?? 0}
                  sx={{ mt: 1 }}
                />
                <Typography
                  variant="caption"
                  sx={{ mt: 0.5, display: "block" }}
                  data-testid="add-version-uploading"
                >
                  Uploading...
                </Typography>
              </>
            )}
            {errors.downloadUrl && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 1, display: "block" }}
              >
                {errors.downloadUrl}
              </Typography>
            )}
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
  <Button variant="contained" onClick={handleSubmit} disabled={loading} data-testid="add-version-submit">
          {loading ? "Adding..." : "Add Version"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddVersionDialog;
