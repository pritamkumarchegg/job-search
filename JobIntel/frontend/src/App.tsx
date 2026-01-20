import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { MainLayout } from "./components/layout/MainLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import PricingPage from "./pages/PricingPage";
import DashboardPage from "./pages/DashboardPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import SavedJobsPage from "./pages/SavedJobsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import SettingsPage from "./pages/SettingsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminCrawlers from "./pages/admin/AdminCrawlers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSkills from "./pages/admin/AdminSkills";
import AdminProfileFields from "./pages/admin/AdminProfileFields";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useEffect(() => {
    // Initialize auth from localStorage on app load
    const { initializeFromStorage } = useAuthStore.getState();
    initializeFromStorage();
  }, []);

  return (
    <Routes>
      {/* Auth pages without layout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Main pages with layout - for regular users */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Route>

      {/* Dashboard pages with sidebar layout - for authenticated users */}
      <Route
        element={
          <ProtectedRoute requiredRole="user">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/saved" element={<SavedJobsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Admin pages with admin layout - for admin users only */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="jobs" element={<AdminJobs />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="profile-fields" element={<AdminProfileFields />} />
        <Route path="skills" element={<AdminSkills />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="crawlers" element={<AdminCrawlers />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="revenue" element={<AdminRevenue />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
