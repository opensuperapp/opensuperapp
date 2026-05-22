/**
 * Access Denied Page
 * 
 * Displayed when authenticated users don't have the required permissions
 */

import { Box, Container, Paper, Typography, Button } from "@mui/material";
import { Block as BlockIcon } from "@mui/icons-material";
import { useAuth } from "../lib/auth-context";

export default function AccessDenied() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f5f5",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            boxShadow: "0px 40px 50px rgba(9, 95, 180, 0.1)",
          }}
        >
          <BlockIcon
            sx={{
              fontSize: 80,
              color: "error.main",
              mb: 2,
            }}
          />
          
          <Typography variant="h4" component="h1" gutterBottom>
            Access Denied
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You don't have permission to access the SuperApp Admin Portal.
            Please contact your administrator to request access.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSignOut}
            sx={{ mt: 2 }}
          >
            Sign Out
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
