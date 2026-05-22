/**
 * Dashboard Component
 *
 * Simple, elegant landing page after login.
 */

import {
  Container,
  Typography,
  Box,
  Paper,
  ButtonBase,
  alpha,
} from "@mui/material";
import { useAuth } from "../../lib/auth-context";
import { useNavigate } from "react-router-dom";
import AppsIcon from "@mui/icons-material/Apps";
import PeopleIcon from "@mui/icons-material/People";
import BarChartIcon from "@mui/icons-material/BarChart";

export default function Dashboard() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const username = state.username || "User";
  const displayName = username.split("@")[0] || username;

  const menuItems = [
    {
      title: "Micro Apps",
      description: "Upload and manage micro applications",
      icon: AppsIcon,
      path: "/microapps",
      color: "#1976d2",
    },
    {
      title: "Users",
      description: "Add and manage users (single or bulk)",
      icon: PeopleIcon,
      path: "/users",
      color: "#2e7d32",
    },
    {
      title: "Analytics",
      description: "View app usage and statistics",
      icon: BarChartIcon,
      path: "/analytics",
      color: "#ed6c02",
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Banner */}
      <Paper
        sx={{
          mb: 4,
          p: 4,
          borderRadius: 1,
          background: "linear-gradient(135deg, #38426eff 0%, #1b6056ff 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background:
              'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          },
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="h1" gutterBottom sx={{ fontWeight: 100 }}>
            Welcome, {displayName}!
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
            Manage your super app ecosystem
          </Typography>
        </Box>
      </Paper>

      {/* Quick Actions Grid */}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <ButtonBase
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 3,
                textAlign: "left",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-8px)",
                },
              }}
            >
              <Paper
                sx={{
                  p: 3,
                  width: "100%",
                  height: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    borderColor: item.color,
                    boxShadow: `0 8px 24px ${alpha(item.color, 0.15)}`,
                    bgcolor: alpha(item.color, 0.02),
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: alpha(item.color, 0.1),
                    mb: 2,
                    transition: "all 0.3s",
                    "button:hover &": {
                      bgcolor: alpha(item.color, 0.2),
                      transform: "scale(1.1)",
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 28, color: item.color }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </Paper>
            </ButtonBase>
          );
        })}
      </Box>
    </Container>
  );
}
