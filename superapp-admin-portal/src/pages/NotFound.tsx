import { Box, Button, Container, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function NotFound() {
  return (
    <Container maxWidth="md" sx={{ py: 10 }}>
      <Box textAlign="center">
        <Typography variant="h3" component="h1" gutterBottom>
          Page not found
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          The page you’re looking for doesn’t exist or was moved.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/">
          Go home
        </Button>
      </Box>
    </Container>
  );
}
