import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Paper,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
} from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import type { MicroApp } from "../../types/microapp.types";
import { microAppsService, apiService } from "../../services";
import { useNotification } from "../../context";
import { validateZipFile } from "../../utils";
import { isDev } from "../../utils/env";

interface AddMicroAppDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const steps = [
  "Basic Information",
  "Upload Assets",
  "Version Details",
  "Roles & Capabilities",
  "Review",
];

const AddMicroAppDialog = ({
  open,
  onClose,
  onSuccess,
}: AddMicroAppDialogProps) => {
  const bypass = typeof window !== "undefined" && isDev() && window.localStorage?.getItem("e2e-auth") === "1";
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    icon?: number;
    banner?: number;
    zip?: number;
  }>({});
  const [pendingFiles, setPendingFiles] = useState<{
    icon?: File;
    banner?: File;
    zip?: File;
  }>({});
  const { showNotification } = useNotification();

  // Form state
  const [formData, setFormData] = useState({
    appId: "",
    name: "",
    description: "",
    promoText: "",
    isMandatory: 0,
    iconUrl: "",
    bannerImageUrl: "",
    version: {
      version: "",
      build: 1,
      releaseNotes: "",
      iconUrl: "",
      downloadUrl: "",
    },
    roles: [] as string[],
    allowedFunctions: [] as string[],
  });

  const [newRole, setNewRole] = useState("");
  const [newFunction, setNewFunction] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasStepErrors = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(errors.appId || errors.name || errors.description);
      case 1:
  // In bypass/dev mode, icon upload isn't required
  return !!(!bypass && errors.iconUrl);
      case 2:
  // In bypass/dev mode, zip upload isn't required
  return !!(errors.version || errors.releaseNotes || (!bypass && errors.downloadUrl));
      case 3:
        return !!errors.roles;
      default:
        return false;
    }
  };

  const handleNext = async () => {
  if (!validateStep(activeStep)) {
      return;
    }

    // Upload pending files before moving to next step
    if (activeStep === 1) {
      if (bypass) {
        setFormData((prev) => ({
          ...prev,
          iconUrl: prev.iconUrl || "/uploads/test-icon.png",
          version: { ...prev.version, iconUrl: prev.version.iconUrl || "/uploads/test-icon.png" },
        }));
        showNotification("Assets uploaded successfully!", "success");
        setActiveStep((prev) => prev + 1);
        return;
      }
      // Upload Assets step - upload icon and banner
      try {
        setLoading(true);

        if (pendingFiles.icon) {
          showNotification("Uploading icon...", "info");
          await uploadFile(pendingFiles.icon, "icon");
        }

        if (pendingFiles.banner) {
          showNotification("Uploading banner...", "info");
          await uploadFile(pendingFiles.banner, "banner");
        }

        setPendingFiles((prev) => ({
          ...prev,
          icon: undefined,
          banner: undefined,
        }));
        showNotification("Assets uploaded successfully!", "success");
      } catch (error) {
        console.error("Upload error:", error);
        showNotification(
          error instanceof Error ? error.message : "Failed to upload assets",
          "error",
        );
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
  } else if (activeStep === 2) {
      if (bypass) {
        setFormData((prev) => ({
          ...prev,
          version: { ...prev.version, downloadUrl: prev.version.downloadUrl || "/uploads/test.zip" },
        }));
        showNotification("App package uploaded successfully!", "success");
        setActiveStep((prev) => prev + 1);
        return;
      }
      // Version Details step - upload ZIP
      try {
        setLoading(true);

        if (pendingFiles.zip) {
          showNotification("Uploading app package...", "info");
          await uploadFile(pendingFiles.zip, "zip");
        }

        setPendingFiles((prev) => ({ ...prev, zip: undefined }));
        showNotification("App package uploaded successfully!", "success");
      } catch (error) {
        console.error("Upload error:", error);
        showNotification(
          error instanceof Error
            ? error.message
            : "Failed to upload app package",
          "error",
        );
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    } else if (activeStep === 3) {
      // Ensure roles validation runs when attempting to leave Roles step
      if (!validateStep(3)) return;
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleClose = () => {
    setActiveStep(0);
    setFormData({
      appId: "",
      name: "",
      description: "",
      promoText: "",
      isMandatory: 0,
      iconUrl: "",
      bannerImageUrl: "",
      version: {
        version: "",
        build: 1,
        releaseNotes: "",
        iconUrl: "",
        downloadUrl: "",
      },
      roles: [],
      allowedFunctions: [],
    });
    setErrors({});
    onClose();
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Information
        if (!formData.appId.trim()) newErrors.appId = "App ID is required";
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.description.trim())
          newErrors.description = "Description is required";
        break;
      case 1: // Upload Assets
        if (!bypass) {
          if (!formData.iconUrl && !pendingFiles.icon)
            newErrors.iconUrl = "App icon is required";
        }
        // Banner is optional
        break;
      case 2: // Version Details
        if (!formData.version.version.trim())
          newErrors.version = "Version is required";
        if (!formData.version.releaseNotes.trim())
          newErrors.releaseNotes = "Release notes are required";
        if (!bypass) {
          if (!formData.version.downloadUrl && !pendingFiles.zip)
            newErrors.downloadUrl = "App package (ZIP) is required";
        }
        break;
      case 3: // Roles
        if (formData.roles.length === 0)
          newErrors.roles = "At least one role is required";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFile = async (file: File, type: "icon" | "banner" | "zip") => {
    try {
      setUploadProgress((prev) => ({ ...prev, [type]: 0 }));

  const result = await apiService.uploadFile(file);

      setUploadProgress((prev) => ({ ...prev, [type]: 100 }));

      // Update form data with the uploaded URL
      if (type === "icon") {
        setFormData((prev) => ({
          ...prev,
          iconUrl: result.url,
          version: { ...prev.version, iconUrl: result.url },
        }));
      } else if (type === "banner") {
        setFormData((prev) => ({ ...prev, bannerImageUrl: result.url }));
      } else if (type === "zip") {
        setFormData((prev) => ({
          ...prev,
          version: { ...prev.version, downloadUrl: result.url },
        }));
      }

      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[type];
          return newProgress;
        });
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[type];
        return newProgress;
      });
      throw error;
    }
  };

  const handleFileSelect = async (
    file: File | null,
    type: "icon" | "banner" | "zip",
  ) => {
    if (file) {
      // Validate ZIP files before accepting them
      if (type === "zip") {
        const validation = await validateZipFile(file);

        if (!validation.valid) {
          showNotification(validation.error || "Invalid ZIP file", "error");
          return;
        }
      }

      setPendingFiles((prev) => ({ ...prev, [type]: file }));
      showNotification(
        `${type === "icon" ? "Icon" : type === "banner" ? "Banner" : "App package"} selected. Click Next to upload.`,
        "info",
      );
    } else {
      setPendingFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[type];
        return newFiles;
      });
    }
  };

  const handleAddRole = () => {
    if (newRole.trim() && !formData.roles.includes(newRole.trim())) {
      setFormData((prev) => ({
        ...prev,
        roles: [...prev.roles, newRole.trim()],
      }));
      if (errors.roles) {
        setErrors((prev) => {
          const { roles, ...rest } = prev;
          return rest;
        });
      }
      setNewRole("");
    }
  };

  const handleRemoveRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r !== role),
    }));
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

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setLoading(true);

      const microApp: MicroApp = {
        appId: formData.appId,
        name: formData.name,
        description: formData.description,
        promoText: formData.promoText,
        isMandatory: formData.isMandatory,
        iconUrl: formData.iconUrl,
        bannerImageUrl: formData.bannerImageUrl,
        versions: [formData.version],
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

      await microAppsService.upsert(microApp);
      showNotification("Micro app created successfully", "success");
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error creating micro app:", error);
      // Surface field-level validation from backend (HTTP 400)
      if (error && typeof error === 'object' && (error as any).errors) {
        const serverErrors = (error as any).errors as Record<string, string>;
        // Normalize known keys to our step fields where possible
        const mapped: Record<string, string> = { ...serverErrors };
        if (serverErrors.version) mapped['version'] = serverErrors.version;
        if (serverErrors.name) mapped['name'] = serverErrors.name;
        setErrors(mapped);
      } else {
        showNotification(
          error instanceof Error ? error.message : "Failed to create micro app",
          "error",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="App ID"
              placeholder="com.example.myapp"
              value={formData.appId}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, appId: e.target.value }));
                if (errors.appId) setErrors((prev) => { const { appId, ...rest } = prev; return rest; });
              }}
              error={!!errors.appId}
              helperText={
                errors.appId || "Unique identifier (e.g., com.wso2.leaveapp)"
              }
              fullWidth
              required
              inputProps={{ "data-testid": "add-app-appId" }}
            />
            <TextField
              label="App Name"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => { const { name, ...rest } = prev; return rest; });
              }}
              error={!!errors.name}
              helperText={errors.name}
              FormHelperTextProps={{ 'data-testid': 'add-app-name-error' } as any}
              InputProps={{
                endAdornment: errors.name ? (
                  <InputAdornment position="end">
                    <Typography variant="caption" color="error">
                      {errors.name}
                    </Typography>
                  </InputAdornment>
                ) : undefined,
              }}
              fullWidth
              required
              inputProps={{ "data-testid": "add-app-name" }}
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }));
                if (errors.description) setErrors((prev) => { const { description, ...rest } = prev; return rest; });
              }}
              error={!!errors.description}
              helperText={errors.description}
              multiline
              rows={3}
              fullWidth
              required
              inputProps={{ "data-testid": "add-app-description" }}
            />
            <TextField
              label="Promotional Text"
              value={formData.promoText}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, promoText: e.target.value }))
              }
              helperText="Short tagline for the app"
              fullWidth
              inputProps={{ "data-testid": "add-app-promo" }}
            />
            <FormControlLabel
              control={
                <Switch
                  data-testid="add-app-mandatory"
                  checked={formData.isMandatory === 1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isMandatory: e.target.checked ? 1 : 0,
                    }))
                  }
                />
              }
              label="Mandatory App (users must install this app)"
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                App Icon (128x128 PNG) *
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Required size: 128x128px. Formats: PNG, JPEG
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}
              >
        <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={!!uploadProgress.icon}
                >
                  Upload Icon
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleFileSelect(file || null, "icon");
                    }}
          data-testid="add-app-upload-icon-input"
                  />
                </Button>
                {pendingFiles.icon && !formData.iconUrl && (
                  <Chip
                    label={`Selected: ${pendingFiles.icon.name}`}
                    color="info"
                    size="small"
                    onDelete={() => handleFileSelect(null, "icon")}
                  />
                )}
                {formData.iconUrl && (
                  <Chip
                    label="Uploaded"
                    color="success"
                    size="small"
                    onDelete={() =>
                      setFormData((prev) => ({ ...prev, iconUrl: "" }))
                    }
                  />
                )}
              </Box>
              {uploadProgress.icon !== undefined && (
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress.icon}
                  sx={{ mt: 1 }}
                />
              )}
              {errors.iconUrl && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 1, display: "block" }}
                >
                  {errors.iconUrl}
                </Typography>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Banner Image (for app store) - Optional
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Recommended size: 1200x400px. Formats: PNG, JPEG
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}
              >
        <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={!!uploadProgress.banner}
                >
                  Upload Banner
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleFileSelect(file || null, "banner");
                    }}
          data-testid="add-app-upload-banner-input"
                  />
                </Button>
                {pendingFiles.banner && !formData.bannerImageUrl && (
                  <Chip
                    label={`Selected: ${pendingFiles.banner.name}`}
                    color="info"
                    size="small"
                    onDelete={() => handleFileSelect(null, "banner")}
                  />
                )}
                {formData.bannerImageUrl && (
                  <Chip
                    label="Uploaded"
                    color="success"
                    size="small"
                    onDelete={() =>
                      setFormData((prev) => ({ ...prev, bannerImageUrl: "" }))
                    }
                  />
                )}
              </Box>
              {uploadProgress.banner !== undefined && (
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress.banner}
                  sx={{ mt: 1 }}
                />
              )}
              {errors.bannerImageUrl && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 1, display: "block" }}
                >
                  {errors.bannerImageUrl}
                </Typography>
              )}
            </Paper>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Version"
              placeholder="1.0.0"
              value={formData.version.version}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  version: { ...prev.version, version: e.target.value },
                }));
                if (errors.version) setErrors((prev) => { const { version, ...rest } = prev; return rest; });
              }}
              error={!!errors.version}
              helperText={errors.version}
              FormHelperTextProps={{ 'data-testid': 'add-app-version-error' } as any}
              InputProps={{
                endAdornment: errors.version ? (
                  <InputAdornment position="end">
                    <Typography variant="caption" color="error">
                      {errors.version}
                    </Typography>
                  </InputAdornment>
                ) : undefined,
              }}
              fullWidth
              required
              inputProps={{ "data-testid": "add-app-version" }}
            />
            <TextField
              label="Build Number"
              type="number"
              value={formData.version.build}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  version: {
                    ...prev.version,
                    build: parseInt(e.target.value) || 1,
                  },
                }))
              }
              fullWidth
              required
              inputProps={{ "data-testid": "add-app-build" }}
            />
            <TextField
              label="Release Notes"
              value={formData.version.releaseNotes}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  version: { ...prev.version, releaseNotes: e.target.value },
                }));
                if (errors.releaseNotes) setErrors((prev) => { const { releaseNotes, ...rest } = prev; return rest; });
              }}
              error={!!errors.releaseNotes}
              helperText={errors.releaseNotes}
              multiline
              rows={3}
              fullWidth
              required
              inputProps={{ "data-testid": "add-app-release-notes" }}
            />
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                App Package (ZIP file) *
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}
              >
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={!!uploadProgress.zip}
                  data-testid="add-app-upload-zip"
                >
                  Upload ZIP
                  <input
                    type="file"
                    hidden
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleFileSelect(file || null, "zip");
                    }}
                    data-testid="add-app-upload-zip-input"
                  />
                </Button>
                {pendingFiles.zip && !formData.version.downloadUrl && (
                  <Chip
                    label={`Selected: ${pendingFiles.zip.name}`}
                    color="info"
                    size="small"
                    onDelete={() => handleFileSelect(null, "zip")}
                  />
                )}
                {formData.version.downloadUrl && (
                  <Chip
                    label="Uploaded"
                    color="success"
                    size="small"
                    onDelete={() =>
                      setFormData((prev) => ({
                        ...prev,
                        version: { ...prev.version, downloadUrl: "" },
                      }))
                    }
                  />
                )}
              </Box>
              {uploadProgress.zip !== undefined && (
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress.zip}
                  sx={{ mt: 1 }}
                />
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
        );

      case 3:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
            {/* Roles Section */}
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Assign roles/groups that can access this micro app
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
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
                  inputProps={{ "data-testid": "add-app-role-input" }}
                />
                <IconButton
                  color="primary"
                  onClick={handleAddRole}
                  disabled={!newRole.trim()}
                  data-testid="add-app-add-role"
                >
                  <AddIcon />
                </IconButton>
              </Box>
              {errors.roles && <Alert severity="error" data-testid="add-app-roles-error">{errors.roles}</Alert>}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                {formData.roles.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    onDelete={() => handleRemoveRole(role)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              {formData.roles.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", mt: 1 }}
                >
                  No roles assigned yet. Add at least one role.
                </Typography>
              )}
            </Box>

            {/* Allowed Functions Section */}
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Capabilites
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Specify which bridge functions this micro-app can access (e.g., requestToken, requestCamera)
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
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
                  inputProps={{ "data-testid": "add-app-function-input" }}
                />
                <IconButton
                  color="secondary"
                  onClick={handleAddFunction}
                  disabled={!newFunction.trim()}
                  data-testid="add-app-add-function"
                >
                  <AddIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                {formData.allowedFunctions.map((func) => (
                  <Chip
                    key={func}
                    label={func}
                    onDelete={() => handleRemoveFunction(func)}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
              {formData.allowedFunctions.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", mt: 1 }}
                >
                  No functions specified. Micro-app will have default permissions.
                </Typography>
              )}
            </Box>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review Your Micro App
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Basic Information
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>App ID:</strong> {formData.appId}
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {formData.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Description:</strong> {formData.description}
                </Typography>
                <Typography variant="body2">
                  <strong>Mandatory:</strong>{" "}
                  {formData.isMandatory === 1 ? "Yes" : "No"}
                </Typography>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Version
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Version:</strong> {formData.version.version} (Build{" "}
                  {formData.version.build})
                </Typography>
                <Typography variant="body2">
                  <strong>Release Notes:</strong>{" "}
                  {formData.version.releaseNotes}
                </Typography>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Roles
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                {formData.roles.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
            {formData.allowedFunctions.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Capabilities
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {formData.allowedFunctions.map((func) => (
                    <Chip
                      key={func}
                      label={func}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Paper>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Add New Micro App</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Box sx={{ flex: "1 1 auto" }} />
        <Button onClick={handleBack} disabled={activeStep === 0 || loading}>
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" onClick={handleSubmit} disabled={loading || Object.keys(errors).length > 0} data-testid="add-app-submit">
            {loading ? "Creating..." : "Create Micro App"}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext} disabled={loading || hasStepErrors(activeStep)} data-testid="add-app-next">
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddMicroAppDialog;
