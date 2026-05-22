import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  Typography,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  TableSortLabel,
} from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import InfoIcon from "@mui/icons-material/Info";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNotification } from "../context";
import { usersService, type User } from "../services";
import { CreateUserDialog, ConfirmDialog } from "..";

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get("q") ?? "");
  const [locationFilter, setLocationFilter] = useState<string>(() => searchParams.get("location") ?? "all");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user?: User;
  }>({
    open: false,
  });
  const { showNotification } = useNotification();

  // Sorting state
  type Order = "asc" | "desc";
  type OrderBy = "name" | "email" | "location";
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<OrderBy>("name");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setForbidden(false);
      const data = await usersService.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      const status = (error as any)?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        showNotification("Failed to load users", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reflect filters to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery.trim()) params.q = searchQuery.trim();
    if (locationFilter && locationFilter !== "all") params.location = locationFilter;
    setSearchParams(params, { replace: true });
  }, [searchQuery, locationFilter, setSearchParams]);

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    fetchUsers();
  };

  const handleDeleteClick = (user: User) => {
    setDeleteDialog({ open: true, user });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.user) return;

    try {
      await usersService.deleteUser(deleteDialog.user.workEmail);
      showNotification("User deleted successfully", "success");
      setDeleteDialog({ open: false });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      showNotification("Failed to delete user", "error");
    }
  };

  // Get unique locations for filter dropdown
  const availableLocations = useMemo(() => {
    const locations = users
      .map((user) => user.location)
      .filter((location): location is string => !!location);
    return Array.from(new Set(locations)).sort();
  }, [users]);

  // Filter users based on search query and location filter
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Location filter
      if (locationFilter !== "all" && user.location !== locationFilter) {
        return false;
      }

      // Search filter (name or email)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.workEmail.toLowerCase();
        return fullName.includes(query) || email.includes(query);
      }

      return true;
    });
  }, [users, searchQuery, locationFilter]);

  // Sorting helpers
  const getComparator = (ord: Order, ob: OrderBy) => {
    return (a: User, b: User) => {
      const valA =
        ob === "name"
          ? `${a.firstName} ${a.lastName}`
          : ob === "email"
          ? a.workEmail
          : a.location ?? "";
      const valB =
        ob === "name"
          ? `${b.firstName} ${b.lastName}`
          : ob === "email"
          ? b.workEmail
          : b.location ?? "";
      const cmp = valA.localeCompare(valB, undefined, { sensitivity: "base" });
      return ord === "asc" ? cmp : -cmp;
    };
  };

  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers];
    arr.sort(getComparator(order, orderBy));
    return arr;
  }, [filteredUsers, order, orderBy]);

  const handleRequestSort = (property: OrderBy) => () => {
    if (orderBy === property) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrder("asc");
      setOrderBy(property);
    }
  };

  if (loading) {
    const rows = Array.from({ length: 5 });
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} data-testid="users-skeleton">
        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Skeleton variant="text" width={180} height={36} />
            <Skeleton variant="text" width={280} height={18} />
          </Box>
          <Skeleton variant="rounded" width={160} height={40} />
        </Box>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Skeleton variant="rounded" width="100%" height={40} />
        </Paper>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell align="right"><Skeleton width={80} /></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((_, idx) => (
                <TableRow key={idx} data-testid="users-skeleton-row">
                  <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
                  <TableCell><Skeleton width={180} /></TableCell>
                  <TableCell><Skeleton width={120} /></TableCell>
                  <TableCell align="right"><Skeleton width={60} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    );
  }

  if (forbidden) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }} data-testid="forbidden-state">
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <PersonIcon sx={{ fontSize: 56, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Not authorized
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don't have permission to view Users. Contact your administrator if you believe this is a mistake.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage user accounts and information
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add User
        </Button>
      </Box>

      {/* Information Notice */}
      <Paper
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: "divider",
          borderLeft: 4,
          borderColor: "warning.main",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <InfoIcon color="info" sx={{ mt: 0.5 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
              Important: IDP Account Required
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This user management is only for the SuperApp database. You must
              also create corresponding accounts in your Identity Provider (IDP)
              with the same email address to grant users access to the
              application.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {users.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: "center",
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 2,
            mx: "auto",
            maxWidth: 600,
          }}
        >
          <PersonIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Users Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Get started by adding your first user
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add First User
          </Button>
        </Paper>
      ) : (
        <>
          {/* Search and Filter Controls */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                inputProps={{ "data-testid": "users-search" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Location</InputLabel>
                <Select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  label="Location"
                  data-testid="users-filter-location-trigger"
                  inputProps={{ "data-testid": "users-filter-location" }}
                >
                  <MenuItem value="all">All Locations</MenuItem>
                  {availableLocations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            {(searchQuery || locationFilter !== "all") && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1.5 }}
              >
                Showing {filteredUsers.length} of {users.length} users
              </Typography>
            )}
          </Paper>

          <TableContainer component={Paper}>
            <Table data-testid="users-table">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === "name" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "name"}
                      direction={orderBy === "name" ? order : "asc"}
                      onClick={handleRequestSort("name")}
                      data-testid="users-sort-name"
                    >
                      User
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "email" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "email"}
                      direction={orderBy === "email" ? order : "asc"}
                      onClick={handleRequestSort("email")}
                      data-testid="users-sort-email"
                    >
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "location" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "location"}
                      direction={orderBy === "location" ? order : "asc"}
                      onClick={handleRequestSort("location")}
                      data-testid="users-sort-location"
                    >
                      Location
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                      <Typography variant="body2" color="text.secondary">
                        No users found matching your filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((user) => (
                    <TableRow key={user.workEmail} hover data-testid={`users-row-${user.workEmail}`}>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            src={user.userThumbnail}
                            alt={`${user.firstName} ${user.lastName}`}
                            sx={{ width: 40, height: 40 }}
                          >
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight="medium" data-testid="user-name">
                              {user.firstName} {user.lastName}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" data-testid="user-email">
                          {user.workEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {user.location ? (
                          <Chip
                            label={user.location}
                            size="small"
                            variant="outlined"
                            data-testid="user-location"
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled" data-testid="user-location">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Delete user">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(user)}
                            data-testid={`users-delete-${user.workEmail}`}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete User"
        message={
          deleteDialog.user
            ? `Are you sure you want to delete ${deleteDialog.user.firstName} ${deleteDialog.user.lastName}? This action cannot be undone.`
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false })}
        confirmText="Delete"
        confirmColor="error"
      />
    </Container>
  );
};

export default Users;
