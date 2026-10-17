import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import SignupPage from "./components/SignupPage";
import LoginPage from "./components/LoginPage";
import CampusNavbar from "./components/common/CampusNavbar";
import CampusVenuesPage from "./components/CampusVenuesPage";
import VenueDetailPage from "./components/VenueDetailPage";
import RecommendationPage from "./components/RecommendationPage";
import MyBookingsPage from "./components/MyBookingsPage";
import ApprovalsQueuePage from "./components/ApprovalsQueuePage";
import AdminDashboard from "./components/AdminDashboard";
import SecurityDashboardPage from "./components/SecurityDashboardPage";
import { DigitalTwinProvider } from "./context/DigitalTwinContext";
import { WhatIfProvider } from "./context/WhatIfContext";
import DigitalTwinDashboard from "./components/digitalTwin/DigitalTwinDashboard";
import WhatIfDashboard from "./components/whatIf/WhatIfDashboard";

function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 font-mono">
          Connecting to Campus Venue Network...
        </p>
      </div>
    );
  }

  return <Navigate to={user ? "/venues" : "/login"} replace />;
}

function SignupRoute() {
  const navigate = useNavigate();
  const { user, loading, signup } = useAuth();

  if (!loading && user) {
    return <Navigate to="/venues" replace />;
  }

  async function handleSignup(formData) {
    await signup(formData);
    navigate("/venues");
  }

  return <SignupPage onSubmit={handleSignup} />;
}

function LoginRoute() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/venues" replace />;
  }

  return <LoginPage />;
}

function DigitalTwinRoute() {
  return (
    <DigitalTwinProvider>
      <DigitalTwinDashboard />
    </DigitalTwinProvider>
  );
}

function WhatIfRoute() {
  return (
    <WhatIfProvider>
      <WhatIfDashboard />
    </WhatIfProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-stone-50 font-sans antialiased text-slate-800">
          <CampusNavbar />
          <main className="flex-1">
            <Routes>
              {/* Home / Login-first routing */}
              <Route path="/" element={<RootRoute />} />

              {/* Public Authentication */}
              <Route path="/signup" element={<SignupRoute />} />
              <Route path="/login" element={<LoginRoute />} />

              {/* Protected Campus Discovery & Details */}
              <Route
                path="/venues"
                element={
                  <ProtectedRoute>
                    <CampusVenuesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/venues/:id"
                element={
                  <ProtectedRoute>
                    <VenueDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected AI Agent & Booking Workflows */}
              <Route
                path="/recommend"
                element={
                  <ProtectedRoute>
                    <RecommendationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute>
                    <MyBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute>
                    <ApprovalsQueuePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin-only: Admin Suite, Security XAI, Digital Twin, What-If */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/security"
                element={
                  <ProtectedRoute adminOnly>
                    <SecurityDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/security"
                element={
                  <ProtectedRoute adminOnly>
                    <SecurityDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/digital-twin"
                element={
                  <ProtectedRoute adminOnly>
                    <DigitalTwinRoute />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/what-if"
                element={
                  <ProtectedRoute adminOnly>
                    <WhatIfRoute />
                  </ProtectedRoute>
                }
              />

              {/* Fallback to root redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;