import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useNotification } from "../../context";
import { useTheme } from "../../context";
const pathNames: Record<string, string> = {
  "": "Dashboard",
  microapps: "Micro Apps",
  users: "Users",
  analytics: "Analytics",
};

export default function Header() {
  const { state, signOut } = useAuth();
  const { showNotification } = useNotification();
  const { mode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const username = state.email || "User";
  const displayName = username.split("@")[0] || username;
  const initials = displayName.slice(0, 2).toUpperCase();

  // Get breadcrumb paths
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const isHomePage = pathSegments.length === 0;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    showNotification("Signing out...", "info");
    // Small delay to show the notification before redirect
    setTimeout(async () => {
      await signOut();
    }, 500);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="h6"
            component="h1"
            onClick={() => navigate("/")}
            sx={{
              color: "primary.main",
              fontWeight: 600,
              cursor: "pointer",
              "&:hover": {
                opacity: 0.8,
              },
            }}
          >
            SuperApp Admin Portal
          </Typography>

          {!isHomePage && (
            <>
              <NavigateNextIcon sx={{ color: "text.disabled", fontSize: 20 }} />
              <Breadcrumbs
                separator={<NavigateNextIcon sx={{ fontSize: 16 }} />}
              >
                {pathSegments.map((segment, index) => {
                  const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
                  const isLast = index === pathSegments.length - 1;
                  const name = pathNames[segment] || segment;

                  return isLast ? (
                    <Typography
                      key={path}
                      color="text.primary"
                      fontWeight={500}
                    >
                      {name}
                    </Typography>
                  ) : (
                    <Link
                      key={path}
                      component="button"
                      onClick={() => navigate(path)}
                      underline="hover"
                      color="text.secondary"
                      sx={{ cursor: "pointer" }}
                    >
                      {name}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            </>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={toggleTheme}
            size="small"
            sx={{ color: "text.primary" }}
            data-testid="theme-toggle"
          >
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: 1,
              borderColor: "divider",
              borderRadius: 3,
              padding: "1px 6px",
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {displayName}
            </Typography>

            <IconButton
              onClick={handleMenuOpen}
              size="small"
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl)}
              sx={{ ml: 0.5, display: "flex", alignItems: "center" }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "primary.main",
                  fontSize: "0.875rem",
                }}
              >
                {initials}
              </Avatar>

              {/* simple visual dropdown indicator */}
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  fontSize: 16,
                  lineHeight: 1,
                  transition: "transform .18s ease",
                  transform: Boolean(anchorEl)
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  color: "text.secondary",
                }}
                aria-hidden
              >
                ▾
              </Box>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem disabled>
              <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
              {username}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
              Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
