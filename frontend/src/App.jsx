import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import SignupPage from "./components/SignupPage";
import LoginPage from "./components/LoginPage";
import CampusNavbar from "./components/common/CampusNavbar";
import CampusVenuesPage from "./components/CampusVenuesPage";
import VenueDetailPage from "./components/VenueDetailPage";
import RecommendationPage from "./components/RecommendationPage";
import MyBookingsPage from "./components/MyBookingsPage";
import ApprovalsQueuePage from "./components/ApprovalsQueuePage";
import AdminDashboard from "./components/AdminDashboard";
import { DigitalTwinProvider } from "./context/DigitalTwinContext";
import { WhatIfProvider } from "./context/WhatIfContext";
import DigitalTwinDashboard from "./components/digitalTwin/DigitalTwinDashboard";
import WhatIfDashboard from "./components/whatIf/WhatIfDashboard";

function SignupRoute() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  async function handleSignup(formData) {
    await signup(formData);
    navigate("/venues");
  }

  return <SignupPage onSubmit={handleSignup} />;
}

function LoginRoute() {
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
              {/* Home & Discovery */}
              <Route path="/" element={<Navigate to="/venues" replace />} />
              <Route path="/venues" element={<CampusVenuesPage />} />
              <Route path="/venues/:id" element={<VenueDetailPage />} />

              {/* AI Agent & Booking Workflows */}
              <Route path="/recommend" element={<RecommendationPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route path="/approvals" element={<ApprovalsQueuePage />} />

              {/* Admin Suite */}
              <Route path="/admin" element={<AdminDashboard />} />

              {/* Authentication */}
              <Route path="/signup" element={<SignupRoute />} />
              <Route path="/login" element={<LoginRoute />} />

              {/* Advanced Modules: Digital Twin & What-If */}
              <Route path="/digital-twin" element={<DigitalTwinRoute />} />
              <Route path="/what-if" element={<WhatIfRoute />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/venues" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;