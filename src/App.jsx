import { useEffect, useState, useRef } from "react";
import { supabase } from "./lib/supabase.js";

import Preloader from "./components/Preloader.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";

const App = () => {
  const [showPreloader, setShowPreloader] = useState(true);
  const [currentPage, setCurrentPage] = useState("welcome");
  const [authStep, setAuthStep] = useState("email");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const recoveryHandled = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setIsCheckingAuth(false);
      return;
    }
    
    const handleRecoveryFlow = () => {
      if (recoveryHandled.current) return;
      recoveryHandled.current = true;
      setAuthStep("newPassword");
      setCurrentPage("auth");
      window.history.replaceState({}, document.title, window.location.pathname);
    };
    
    const checkHashForRecovery = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        return true;
      }
      return false;
    };
    
    if (checkHashForRecovery()) {
      handleRecoveryFlow();
      setIsCheckingAuth(false);
      return;
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        handleRecoveryFlow();
        setIsCheckingAuth(false);
      }
    });
    
    setIsCheckingAuth(false);
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isCheckingAuth) return;
    
    setShowPreloader(true);
    const timeoutId = setTimeout(() => {
      setShowPreloader(false);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [currentPage, isCheckingAuth]);

  if (showPreloader) {
    return <Preloader />;
  }

  const openAuthFlow = (step) => {
    setAuthStep(step);
    setCurrentPage("auth");
  };

  if (currentPage === "welcome") {
    return (
      <OnboardingPage
        onCreateAccount={() => openAuthFlow("email")}
        onLogin={() => openAuthFlow("loginEmail")}
      />
    );
  }

  if (currentPage === "home") {
    return <HomePage />;
  }

  return (
    <AuthPage
      initialStep={authStep}
      onSignupComplete={() => setCurrentPage("home")}
      onLoginComplete={() => setCurrentPage("home")}
    />
  );
};

export default App;
