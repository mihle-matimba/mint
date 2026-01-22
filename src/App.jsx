import { Route, Routes, useNavigate } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import CreditPage from "./pages/CreditPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import InvestPage from "./pages/InvestPage.jsx";
import MorePage from "./pages/MorePage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import RewardsPage from "./pages/RewardsPage.jsx";
import TransactPage from "./pages/TransactPage.jsx";
import UserOnboardingPage from "./pages/UserOnboardingPage.jsx";

const WelcomeRoute = () => {
  const navigate = useNavigate();
  return (
    <OnboardingPage
      onCreateAccount={() => navigate("/signup")}
      onLogin={() => navigate("/login")}
    />
  );
};

const LoginRoute = () => {
  const navigate = useNavigate();
  return (
    <AuthPage
      initialStep="loginEmail"
      onLoginComplete={() => navigate("/home")}
      onSignupComplete={() => navigate("/onboarding")}
    />
  );
};

const SignupRoute = () => {
  const navigate = useNavigate();
  return (
    <AuthPage
      initialStep="email"
      onSignupComplete={() => navigate("/onboarding")}
      onLoginComplete={() => navigate("/home")}
    />
  );
};

const UserOnboardingRoute = () => {
  const navigate = useNavigate();
  return <UserOnboardingPage onComplete={() => navigate("/home")} />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomeRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />
      <Route path="/onboarding" element={<UserOnboardingRoute />} />

      <Route element={<AppShell />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/credit" element={<CreditPage />} />
        <Route path="/invest" element={<InvestPage />} />
        <Route path="/transact" element={<TransactPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/more" element={<MorePage />} />
      </Route>
    </Routes>
  );
};

export default App;
