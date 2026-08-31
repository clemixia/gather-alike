// src/App.tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import HomePage from './pages/HomePage';
import CoupleSetupPage from './pages/CoupleSetupPage';
import InvitePartnerPage from './pages/InvitePartnerPage';
import JoinCouplePage from './pages/JoinCouplePage';
import HouseSelectionPage from './pages/HouseSelectionPage'; // ← NEW

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        
        {/* Couple Onboarding */}
        <Route path="/couple/setup" element={<CoupleSetupPage />} />
        <Route path="/couple/invite" element={<InvitePartnerPage />} />
        <Route path="/couple/join" element={<JoinCouplePage />} />
        
        {/* House Selection ← NEW */}
        <Route path="/house-selection" element={<HouseSelectionPage />} />
        
        {/* Main App */}
        <Route path="/home" element={<HomePage />} />
        
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}