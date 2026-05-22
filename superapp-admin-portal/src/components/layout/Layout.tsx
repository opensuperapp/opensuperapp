import {
  Box,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import BarChartIcon from "@mui/icons-material/BarChart";
import AppsIcon from "@mui/icons-material/Apps";
import { useNavigate } from "react-router-dom";
import Header from "../common/Header";
import Footer from "../common/Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const menuItems = [
    {
      title: "Micro Apps",
      icon: <AppsIcon sx={{ color: "#1976d2" }} />,
      path: "/",
    },
    {
      title: "Users",
      icon: <PeopleIcon sx={{ color: "#2e7d32" }} />,
      path: "/users",
    },
    {
      title: "Analytics",
      icon: <BarChartIcon sx={{ color: "#ed6c02" }} />,
      path: "/analytics",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "row",
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          width: 220,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 220,
            boxSizing: "border-box",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 2,
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          <img
            src="/icon.svg"
            alt="App Icon"
            style={{ width: 48, height: 48 }}
          />
        </Box>
        <List sx={{ width: "100%" }}>
          {menuItems.map((item) => (
            <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.title} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
