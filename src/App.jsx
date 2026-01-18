import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import AppLayout from "./components/AppLayout.tsx";
import Preloader from "./components/Preloader.jsx";
import AddMoneyPage from "./pages/AddMoneyPage.tsx";
import AuthPage from "./pages/AuthPage.jsx";
import ClaimRewardsPage from "./pages/ClaimRewardsPage.tsx";
import CreditPage from "./pages/CreditPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import InvestPage from "./pages/InvestPage.tsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import PayPage from "./pages/PayPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";

const AuthRoute = () => {
  const navigate = useNavigate();

  return (
    <AuthPage
      onSignupComplete={() => navigate("/onboarding")}
      onLoginComplete={() => navigate("/home")}
    />
  );
};

const OnboardingRoute = () => {
  const navigate = useNavigate();

  return <OnboardingPage onGetStarted={() => navigate("/home")} />;
};

const App = () => {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowPreloader(false);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, []);

  if (showPreloader) {
    return <Preloader />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="home" element={<HomePage />} />
        <Route path="credit" element={<CreditPage />} />
        <Route path="invest" element={<InvestPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="pay" element={<PayPage />} />
        <Route path="add-money" element={<AddMoneyPage />} />
        <Route path="rewards" element={<ClaimRewardsPage />} />
      </Route>
      <Route path="auth" element={<AuthRoute />} />
      <Route path="onboarding" element={<OnboardingRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
