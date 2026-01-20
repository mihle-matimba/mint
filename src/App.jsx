import { useEffect, useState } from "react";
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

  useEffect(() => {
    const checkPasswordRecovery = async () => {
      if (!supabase) {
        setIsCheckingAuth(false);
        return;
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const urlParams = new URLSearchParams(window.location.search);
        const isReset = urlParams.get('reset') === 'true';
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        if ((isReset || type === 'recovery') && (session || accessToken)) {
          setAuthStep("newPassword");
          setCurrentPage("auth");
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.error('Error checking auth state:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkPasswordRecovery();
    
    if (!supabase) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthStep("newPassword");
        setCurrentPage("auth");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
    
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
