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
    if (!supabase) {
      setIsCheckingAuth(false);
      return;
    }
    
    const handleRecoveryFlow = () => {
      setAuthStep("newPassword");
      setCurrentPage("auth");
      window.history.replaceState({}, document.title, window.location.pathname);
    };
    
    const checkInitialState = async () => {
      try {
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        const isReset = urlParams.get('reset') === 'true';
        
        if (hash && hash.includes('type=recovery')) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (!error) {
              handleRecoveryFlow();
              return;
            }
          }
        }
        
        if (isReset) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            handleRecoveryFlow();
            return;
          }
        }
      } catch (err) {
        console.error('Error checking auth state:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkInitialState();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        handleRecoveryFlow();
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
