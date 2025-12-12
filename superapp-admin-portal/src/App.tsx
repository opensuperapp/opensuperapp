/**
 * App Component
 *
 * Main application entry point with authentication routing.
 */

import { useAuth } from "./lib/auth-context";
import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout, Loading } from ".";
import Login from "./pages/Login";
import MicroApps from "./pages/MicroApps";
import Users from "./pages/Users";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import { useNotification } from "./context";
import { apiService } from "./services";

function App() {
  const { state, getAccessToken, signOut } = useAuth();
  const { showNotification } = useNotification();
  const hasShownLoginNotification = useRef(false);

  // Initialize API service with token getter and sign out function
  useEffect(() => {
    if (state.isAuthenticated) {
      console.log("Setting up API service with auth functions");

      // Create stable wrappers inside effect to avoid unnecessary re-renders
      const tokenGetter = async () => {
        try {
          const token = await getAccessToken();
          return token || "";
        } catch (error) {
          console.error("Error getting access token:", error);
          return "";
        }
      };

      const signOutHandler = async () => {
        await signOut();
      };

      apiService.setTokenGetter(tokenGetter);
      apiService.setSignOut(signOutHandler);

      // Cleanup: Reset the service when user logs out
      return () => {
        console.log("Cleaning up API service auth functions");
        apiService.reset();
      };
    }
  }, [state.isAuthenticated, getAccessToken, signOut]);

  // Show notification when user logs in
  useEffect(() => {
    if (state.isAuthenticated && !hasShownLoginNotification.current) {
      showNotification("Successfully signed in", "success");
      hasShownLoginNotification.current = true;
    } else if (!state.isAuthenticated) {
      // Reset notification flag when user logs out
      hasShownLoginNotification.current = false;
    }
  }, [state.isAuthenticated, showNotification]);

  // Show loading spinner while checking authentication status
  if (state.isLoading) {
    console.log("Authentication loading...");
    return <Loading />;
  }

  // Show login page if not authenticated
  if (!state.isAuthenticated) {
    console.log("User not authenticated, showing login page");
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<MicroApps />} />
          <Route path="/users" element={<Users />} />
          <Route path="/analytics" element={<ComingSoon />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
