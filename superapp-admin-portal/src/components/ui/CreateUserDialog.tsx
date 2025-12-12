import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tab,
  Tabs,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useNotification } from "../../context";
import { usersService, type User } from "../../services";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const CreateUserDialog = ({
  open,
  onClose,
  onSuccess,
}: CreateUserDialogProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  // Single user state
  const [singleUser, setSingleUser] = useState<User>({
    workEmail: "",
    firstName: "",
    lastName: "",
    userThumbnail: "",
    location: "",
  });

  // Bulk users state
  const [bulkUsers, setBulkUsers] = useState<User[]>([
    {
      workEmail: "",
      firstName: "",
      lastName: "",
      userThumbnail: "",
      location: "",
    },
  ]);
  // Track file-driven loads to show a succinct summary in UI/tests
  const [bulkLoadedCount, setBulkLoadedCount] = useState<number | null>(null);
  // Invalid rows captured during parsing (line numbers start at 2 for data row)
  const [bulkInvalidRows, setBulkInvalidRows] = useState<Array<{ line: number; reason: string }>>([]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSingleUserChange = (field: keyof User, value: string) => {
    setSingleUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleBulkUserChange = (
    index: number,
    field: keyof User,
    value: string,
  ) => {
    setBulkUsers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addBulkUser = () => {
    setBulkUsers((prev) => [
      ...prev,
      {
        workEmail: "",
        firstName: "",
        lastName: "",
        userThumbnail: "",
        location: "",
      },
    ]);
  setBulkLoadedCount(null);
  };

  const removeBulkUser = (index: number) => {
    if (bulkUsers.length > 1) {
      setBulkUsers((prev) => prev.filter((_, i) => i !== index));
    }
  setBulkLoadedCount(null);
  };

  const validateSingleUser = (): boolean => {
    if (
      !singleUser.workEmail ||
      !singleUser.firstName ||
      !singleUser.lastName
    ) {
      showNotification("Please fill in all required fields", "error");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(singleUser.workEmail)) {
      showNotification("Please enter a valid email address", "error");
      return false;
    }
    return true;
  };

  const validateBulkUsers = (): boolean => {
    for (let i = 0; i < bulkUsers.length; i++) {
      const user = bulkUsers[i];
      if (!user.workEmail || !user.firstName || !user.lastName) {
        showNotification(
          `Please fill in all required fields for user ${i + 1}`,
          "error",
        );
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.workEmail)) {
        showNotification(
          `Please enter a valid email address for user ${i + 1}`,
          "error",
        );
        return false;
      }
    }
    // Check for duplicate emails
    const emails = bulkUsers.map((u) => u.workEmail.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      showNotification("Duplicate email addresses found", "error");
      return false;
    }
    return true;
  };

  // Basic CSV parser for simple, comma-separated values without embedded commas
  // Expected headers: workEmail,firstName,lastName,userThumbnail?,location?
  const parseCsvToUsers = (csvText: string): { valid: User[]; errors: Array<{ line: number; reason: string }> } => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return { valid: [], errors: [] };
    const headers = lines[0].split(",").map((h) => h.trim());
    const idx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const iEmail = idx("workEmail");
    const iFirst = idx("firstName");
    const iLast = idx("lastName");
    const iThumb = idx("userThumbnail");
    const iLoc = idx("location");
    if (iEmail < 0 || iFirst < 0 || iLast < 0) return { valid: [], errors: [{ line: 1, reason: "Missing required headers: workEmail, firstName, lastName" }] };
    const users: User[] = [];
    const errors: Array<{ line: number; reason: string }> = [];
    for (let li = 1; li < lines.length; li++) {
      const cols = lines[li].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      const workEmail = cols[iEmail] || "";
      const firstName = cols[iFirst] || "";
      const lastName = cols[iLast] || "";
      const userThumbnail = iThumb >= 0 ? cols[iThumb] || "" : "";
      const location = iLoc >= 0 ? cols[iLoc] || "" : "";
      // Per-row validation
      if (!workEmail || !firstName || !lastName) {
        errors.push({ line: li + 1, reason: "Missing required fields" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
        errors.push({ line: li + 1, reason: "Invalid email" });
        continue;
      }
      users.push({ workEmail, firstName, lastName, userThumbnail, location });
    }
    return { valid: users, errors };
  };

  const handleBulkFile = async (file: File) => {
    try {
      const text = await file.text();
      let parsed: User[] = [];
      let parseErrors: Array<{ line: number; reason: string }> = [];
      if (file.name.toLowerCase().endsWith(".json")) {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          parsed = json as User[];
        }
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        const result = parseCsvToUsers(text);
        parsed = result.valid;
        parseErrors = result.errors;
      } else {
        showNotification("Unsupported file type. Use .csv or .json.", "error");
        return;
      }

      // Basic sanitation: remove falsy or missing required
      parsed = (parsed || []).filter(
        (u) => !!u && !!u.workEmail && !!u.firstName && !!u.lastName,
      );

      // Deduplicate by email
      const seen = new Set<string>();
      const unique = parsed.filter((u) => {
        const key = u.workEmail.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Show parsing issues and duplicate lines if any
      const dupErrors: Array<{ line: number; reason: string }> = [];
      // We can't determine original line of duplicates from JSON; for CSV we already filtered earlier
      // So only general duplicate report here
      if (parsed.length !== unique.length) {
        dupErrors.push({ line: -1, reason: "Duplicate email addresses found" });
      }

      setBulkInvalidRows([...(parseErrors ?? []), ...dupErrors]);

      if (unique.length === 0) {
        showNotification("No valid users found in file", "error");
        return;
      }

      setBulkUsers(unique.map((u) => ({
        workEmail: u.workEmail || "",
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        userThumbnail: u.userThumbnail || "",
        location: u.location || "",
      })));
  setBulkLoadedCount(unique.length);
      showNotification(`Loaded ${unique.length} users from file`, "success");
    } catch (e) {
      console.error("Bulk file parse error:", e);
      showNotification("Failed to parse file. Check format.", "error");
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (tabValue === 0) {
        // Single user
        if (!validateSingleUser()) {
          return;
        }
        await usersService.createUser(singleUser);
        showNotification("User created successfully", "success");
      } else {
        // Bulk users
        if (!validateBulkUsers()) {
          return;
        }
        const result = await usersService.createBulkUsers(bulkUsers);
        if (result && (result.failed?.length ?? 0) > 0) {
          // Partial success: show summary and keep dialog open for user to fix
          const ok = result.success?.length ?? 0;
          const failed = result.failed?.length ?? 0;
          showNotification(`Created ${ok} users. ${failed} failed.`, "warning");
          // Map failed reasons to an inline list
          const inline = result.failed.map((f) => ({ line: -1, reason: `${f.workEmail}: ${f.reason}` }));
          setBulkInvalidRows(inline);
          setLoading(false);
          return; // do not close dialog; user can correct and resubmit
        } else {
          showNotification(
            `${bulkUsers.length} users created successfully`,
            "success",
          );
        }
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error creating user(s):", error);
      showNotification("Failed to create user(s)", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Reset form
      setSingleUser({
        workEmail: "",
        firstName: "",
        lastName: "",
        userThumbnail: "",
        location: "",
      });
  setBulkUsers([
        {
          workEmail: "",
          firstName: "",
          lastName: "",
          userThumbnail: "",
          location: "",
        },
      ]);
  setBulkLoadedCount(null);
  setBulkInvalidRows([]);
      setTabValue(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Add Users
          </Typography>
      <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              icon={<PersonAddIcon />}
              label="Single User"
              iconPosition="start"
        data-testid="create-user-tab-single"
            />
            <Tab
              icon={<GroupAddIcon />}
              label="Bulk Add"
              iconPosition="start"
        data-testid="create-user-tab-bulk"
            />
          </Tabs>
        </Box>
      </DialogTitle>

      <DialogContent>
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={singleUser.workEmail}
              onChange={(e) =>
                handleSingleUserChange("workEmail", e.target.value)
              }
              fullWidth
              required
              inputProps={{ 'data-testid': 'create-user-email' }}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="First Name"
                value={singleUser.firstName}
                onChange={(e) =>
                  handleSingleUserChange("firstName", e.target.value)
                }
                fullWidth
                required
                inputProps={{ 'data-testid': 'create-user-first-name' }}
              />
              <TextField
                label="Last Name"
                value={singleUser.lastName}
                onChange={(e) =>
                  handleSingleUserChange("lastName", e.target.value)
                }
                fullWidth
                required
                inputProps={{ 'data-testid': 'create-user-last-name' }}
              />
            </Box>
            <TextField
              label="Profile Picture URL"
              value={singleUser.userThumbnail}
              onChange={(e) =>
                handleSingleUserChange("userThumbnail", e.target.value)
              }
              fullWidth
              inputProps={{ 'data-testid': 'create-user-avatar' }}
            />
            <TextField
              label="Location"
              value={singleUser.location}
              onChange={(e) =>
                handleSingleUserChange("location", e.target.value)
              }
              fullWidth
              inputProps={{ 'data-testid': 'create-user-location' }}
            />
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            {/* File uploader for CSV/JSON */}
            <Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<GroupAddIcon />}
                data-testid="bulk-upload-button"
              >
                Upload CSV/JSON
                <input
                  type="file"
                  accept=".csv,.json"
                  hidden
                  data-testid="bulk-upload-input"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) {
                      void handleBulkFile(file);
                      // reset the input so same file can be re-selected if needed
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </Button>
              {bulkLoadedCount !== null && (
                <Typography variant="body2" sx={{ mt: 1 }} data-testid="bulk-upload-summary">
                  Loaded {bulkLoadedCount} users from file
                </Typography>
              )}
              {bulkInvalidRows.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="error" data-testid="bulk-invalid-title">
                    Issues found:
                  </Typography>
                  <ul data-testid="bulk-invalid-list" style={{ marginTop: 4, paddingLeft: 16 }}>
                    {bulkInvalidRows.map((e, idx) => (
                      <li key={idx} data-testid={`bulk-invalid-item-${idx}`}>
                        {e.line > 0 ? `Line ${e.line}: ${e.reason}` : e.reason}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Box>
            {bulkUsers.map((user, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  position: "relative",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    User {index + 1}
                  </Typography>
                  {bulkUsers.length > 1 && (
                    <Tooltip title="Remove user">
                      <IconButton
                        size="small"
                        onClick={() => removeBulkUser(index)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    type="email"
                    value={user.workEmail}
                    onChange={(e) =>
                      handleBulkUserChange(index, "workEmail", e.target.value)
                    }
                    fullWidth
                    required
                    size="small"
                  />
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="First Name"
                      value={user.firstName}
                      onChange={(e) =>
                        handleBulkUserChange(index, "firstName", e.target.value)
                      }
                      fullWidth
                      required
                      size="small"
                    />
                    <TextField
                      label="Last Name"
                      value={user.lastName}
                      onChange={(e) =>
                        handleBulkUserChange(index, "lastName", e.target.value)
                      }
                      fullWidth
                      required
                      size="small"
                    />
                  </Box>
                  <TextField
                    label="Profile Picture URL"
                    value={user.userThumbnail}
                    onChange={(e) =>
                      handleBulkUserChange(
                        index,
                        "userThumbnail",
                        e.target.value,
                      )
                    }
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Location"
                    value={user.location}
                    onChange={(e) =>
                      handleBulkUserChange(index, "location", e.target.value)
                    }
                    fullWidth
                    size="small"
                  />
                </Stack>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={addBulkUser}
              variant="outlined"
              fullWidth
            >
              Add Another User
            </Button>
          </Stack>
        </TabPanel>
      </DialogContent>

      <DialogActions>
  <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
  <Button onClick={handleSubmit} variant="contained" disabled={loading} data-testid="create-user-submit">
          {loading
            ? "Creating..."
            : tabValue === 0
              ? "Create User"
              : `Create ${bulkUsers.length} Users`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateUserDialog;
