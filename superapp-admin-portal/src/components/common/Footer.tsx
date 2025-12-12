import { Box, Typography, Container } from "@mui/material";
export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        mt: "auto",
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Container>
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 1 }}
          >
            © {new Date().getFullYear()} All rights reserved
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
