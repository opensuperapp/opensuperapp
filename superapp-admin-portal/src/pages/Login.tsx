/**
 * Login Page
 *
 * Simple, elegant login interface.
 * Always uses light mode for consistent branding.
 */

import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  ThemeProvider,
} from "@mui/material";
import { useAuth } from "../lib/auth-context";
import LoginIcon from "@mui/icons-material/Login";
import loginBanner from "../assets/images/login-banner.png";
import { createAppTheme } from "../theme";

export default function Login() {
  const { signIn } = useAuth();

  // Always use light theme for login page
  const lightTheme = createAppTheme("light");

  return (
    <ThemeProvider theme={lightTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f5f5",
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              // shadow
              boxShadow: "0px 40px 50px rgba(9, 95, 180, 0.1)",
            }}
          >
            <img
              src={loginBanner}
              alt="SuperApp Admin Portal"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
            <Typography
              variant="h2"
              gutterBottom
              sx={{ fontWeight: 200, color: "primary.main" }}
            >
              SuperApp Admin Portal
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Sign in to manage your applications
            </Typography>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => signIn()}
              startIcon={<LoginIcon />}
              sx={{ py: 1.5 }}
            >
              Sign In
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: "block" }}>
              Secure sign-in enabled
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
