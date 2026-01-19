import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import TextInput from './TextInput.jsx';
import PasswordInput from './PasswordInput.jsx';
import PrimaryButton from './PrimaryButton.jsx';
import PasswordStrengthIndicator, { getPasswordStrength } from './PasswordStrengthIndicator.jsx';

const OTP_LENGTH = 6;
const OTP_EXPIRY_TIME = 180;
const RESEND_COOLDOWN = 30;
const MAX_RESEND_ATTEMPTS = 5;
const MAX_OTP_ATTEMPTS = 5;
const COOLDOWN_TIMES = [300, 1800];
const VALID_OTP = '123456';

const AuthForm = ({ initialStep = 'email', onSignupComplete, onLoginComplete }) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [otp, setOtp] = useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [toast, setToast] = useState({ message: '', visible: false });
  
  const [otpExpiry, setOtpExpiry] = useState(OTP_EXPIRY_TIME);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [cooldownLevel, setCooldownLevel] = useState(0);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [showRateLimitScreen, setShowRateLimitScreen] = useState(false);
  const [rateLimitDismissCountdown, setRateLimitDismissCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const toastTimeout = useRef(null);
  const loginTimeout = useRef(null);
  const otpRefs = useRef([]);
  const otpExpiryInterval = useRef(null);
  const resendCooldownInterval = useRef(null);
  const rateLimitInterval = useRef(null);
  const rateLimitDismissInterval = useRef(null);

  const heroDefault = 'Get started';
  const heroSubDefault = useMemo(
    () => (
      <>
        Create your <span className="mint-brand">MINT</span> account
      </>
    ),
    []
  );

  const showStep = (stepName) => {
    setCurrentStep(stepName);
  };

  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  const showToast = (message) => {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }
    setToast({ message, visible: true });
    toastTimeout.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      if (loginTimeout.current) clearTimeout(loginTimeout.current);
      if (otpExpiryInterval.current) clearInterval(otpExpiryInterval.current);
      if (resendCooldownInterval.current) clearInterval(resendCooldownInterval.current);
      if (rateLimitInterval.current) clearInterval(rateLimitInterval.current);
    };
  }, []);

  const startOtpTimer = useCallback(() => {
    setOtpExpiry(OTP_EXPIRY_TIME);
    setResendCooldown(RESEND_COOLDOWN);
    
    if (otpExpiryInterval.current) clearInterval(otpExpiryInterval.current);
    if (resendCooldownInterval.current) clearInterval(resendCooldownInterval.current);
    
    otpExpiryInterval.current = setInterval(() => {
      setOtpExpiry((prev) => {
        if (prev <= 1) {
          clearInterval(otpExpiryInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    resendCooldownInterval.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(resendCooldownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startRateLimitCooldown = useCallback(() => {
    const cooldownTime = COOLDOWN_TIMES[Math.min(cooldownLevel, COOLDOWN_TIMES.length - 1)];
    setRateLimitCooldown(cooldownTime);
    setCooldownLevel((prev) => prev + 1);
    setShowRateLimitScreen(true);
    setRateLimitDismissCountdown(10);
    
    if (rateLimitInterval.current) clearInterval(rateLimitInterval.current);
    if (rateLimitDismissInterval.current) clearInterval(rateLimitDismissInterval.current);
    
    rateLimitInterval.current = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(rateLimitInterval.current);
          setResendAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    rateLimitDismissInterval.current = setInterval(() => {
      setRateLimitDismissCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(rateLimitDismissInterval.current);
          setShowRateLimitScreen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldownLevel]);

  const handleOtpChange = (value, index) => {
    const sanitized = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = sanitized;
    setOtp(next);
    if (sanitized && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !otp[index] && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };

  const isOtpBlocked = otpAttempts >= MAX_OTP_ATTEMPTS || otpExpiry <= 0 || rateLimitCooldown > 0;

  const checkOtpValue = useCallback(async (values) => {
    const code = values.join('');
    if (code.length !== OTP_LENGTH) return;
    
    if (otpExpiry <= 0) {
      showToast('Code has expired. Please request a new one.');
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      return;
    }
    
    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      showToast('Maximum attempts reached. Please request a new code.');
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });
      
      if (error) {
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        
        if (newAttempts >= MAX_OTP_ATTEMPTS) {
          showToast('Maximum attempts reached. Please request a new code.');
          setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
          setIsLoading(false);
          return;
        }
        
        showToast(`Incorrect code. ${MAX_OTP_ATTEMPTS - newAttempts} attempts remaining.`);
        setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
        otpRefs.current[0]?.focus();
        setIsLoading(false);
        return;
      }
      
      if (otpExpiryInterval.current) clearInterval(otpExpiryInterval.current);
      if (resendCooldownInterval.current) clearInterval(resendCooldownInterval.current);
      
      showToast('Email verified successfully!');
      
      setTimeout(() => {
        if (onSignupComplete) {
          onSignupComplete();
        }
      }, 1000);
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [otpAttempts, otpExpiry, email, onSignupComplete]);

  useEffect(() => {
    const code = otp.join('');
    if (code.length === OTP_LENGTH) {
      checkOtpValue(otp);
    }
  }, [otp, checkOtpValue]);

  const handleOtpPaste = (event) => {
    const text = event.clipboardData?.getData('text')?.replace(/\D/g, '') ?? '';
    if (!text) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => text[index] ?? '');
    setOtp(next);
    otpRefs.current[Math.min(text.length, OTP_LENGTH) - 1]?.focus();
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || rateLimitCooldown > 0) return;
    
    const newResendAttempts = resendAttempts + 1;
    setResendAttempts(newResendAttempts);
    
    if (newResendAttempts >= MAX_RESEND_ATTEMPTS) {
      startRateLimitCooldown();
      showToast('Too many resend attempts. Please wait before trying again.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        showToast(error.message);
        setIsLoading(false);
        return;
      }
      
      setOtpAttempts(0);
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      startOtpTimer();
      showToast('New verification code sent to your email.');
      otpRefs.current[0]?.focus();
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmail = () => {
    if (rateLimitCooldown > 0) return;
    
    const newResendAttempts = resendAttempts + 1;
    setResendAttempts(newResendAttempts);
    
    if (newResendAttempts >= MAX_RESEND_ATTEMPTS) {
      startRateLimitCooldown();
      showToast('Too many attempts. Please wait before trying again.');
      return;
    }
    
    if (otpExpiryInterval.current) clearInterval(otpExpiryInterval.current);
    if (resendCooldownInterval.current) clearInterval(resendCooldownInterval.current);
    setOtpAttempts(0);
    setOtpExpiry(OTP_EXPIRY_TIME);
    setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    setIsEditingEmail(true);
    showStep('email');
  };

  const isLoginStep = currentStep.startsWith('login');
  const heroHeading = isLoginStep ? 'Welcome back' : heroDefault;
  const heroSubheading = isLoginStep ? (
    <>
      Log in to your <span className="mint-brand">MINT</span> account
    </>
  ) : (
    heroSubDefault
  );

  const handleEmailContinue = () => {
    if (email && email.includes('@') && email.includes('.')) {
      if (isEditingEmail) {
        setIsEditingEmail(false);
        showStep('otp');
        startOtpTimer();
        showToast('New verification code sent to your email.');
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
        return;
      }
      showStep('firstName');
      return;
    }
    showToast('Enter a valid email address to continue.');
  };

  const handleFirstNameContinue = () => {
    if (firstName.trim().length > 0) {
      showStep('lastName');
      return;
    }
    showToast('Add your first name to continue.');
  };

  const handleLastNameContinue = () => {
    if (lastName.trim().length > 0) {
      showStep('password');
      return;
    }
    showToast('Add your last name to continue.');
  };

  const handleLoginContinue = () => {
    if (loginEmail && loginEmail.includes('@') && loginEmail.includes('.')) {
      showStep('loginPassword');
      return;
    }
    showToast('Enter the email you signed up with.');
  };

  const handleLoginSubmit = async () => {
    if (!loginEmail || !loginEmail.includes('@') || !loginEmail.includes('.')) {
      showToast('Enter a valid email address.');
      return;
    }
    if (loginPassword.length < 6) {
      showToast('Your password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (error) {
        showToast(error.message);
        setIsLoading(false);
        return;
      }
      
      if (onLoginComplete) {
        onLoginComplete();
      }
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordContinue = () => {
    const strength = getPasswordStrength(password);
    if (strength.level < 3) {
      showToast('Your password must meet all requirements to continue.');
      return;
    }
    showStep('confirm');
  };

  const handleConfirmContinue = async () => {
    if (password.length < 8) {
      showToast('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords don't match.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      
      if (error) {
        showToast(error.message);
        setIsLoading(false);
        return;
      }
      
      startOtpTimer();
      showStep('otp');
      showToast('Verification code sent to your email.');
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formSubmit = (event) => {
    event.preventDefault();
    if (currentStep === 'confirm') {
      handleConfirmContinue();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <>
      <div className="flex flex-1 items-center justify-center px-6 pt-32 pb-16 relative z-10">
        <div className="w-full max-w-md space-y-12">
          <div id="hero-copy" className={`text-center space-y-5 ${currentStep === 'otp' ? 'hidden' : ''}`}>
            <h2 id="hero-heading" className="text-5xl sm:text-6xl font-light tracking-tight animate-on-load delay-2">
              {heroHeading}
            </h2>
            <p id="hero-subheading" className="text-lg text-muted-foreground animate-on-load delay-3">
              {heroSubheading}
            </p>
          </div>

          <form id="signup-form" className="space-y-10" noValidate onSubmit={formSubmit}>
            <div id="step-email" className={`step ${currentStep === 'email' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${email ? 'has-value' : ''}`}>
                <TextInput
                  type="email"
                  id="email"
                  placeholder="Your email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleEmailContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <p className="text-center text-sm text-muted-foreground animate-on-load delay-5">
                Already have an account?
                <button
                  type="button"
                  id="show-login"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                  onClick={() => showStep('loginEmail')}
                >
                  Login
                </button>
              </p>
            </div>

            <div id="step-first-name" className={`step ${currentStep === 'firstName' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${firstName ? 'has-value' : ''}`}>
                <TextInput
                  id="first-name"
                  placeholder="First name"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleFirstNameContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <button
                type="button"
                id="back-to-email"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('email')}
              >
                ← Back
              </button>
            </div>

            <div id="step-last-name" className={`step ${currentStep === 'lastName' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${lastName ? 'has-value' : ''}`}>
                <TextInput
                  id="last-name"
                  placeholder="Last name"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleLastNameContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <button
                type="button"
                id="back-to-first-name"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('firstName')}
              >
                ← Back
              </button>
            </div>

            <div id="step-login-email" className={`step ${currentStep === 'loginEmail' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${loginEmail ? 'has-value' : ''}`}>
                <TextInput
                  type="email"
                  id="login-email"
                  placeholder="Email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleLoginContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <p className="text-center text-sm text-muted-foreground animate-on-load delay-5">
                Need an account?
                <button
                  type="button"
                  id="back-to-signup"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                  onClick={() => showStep('email')}
                >
                  Sign up
                </button>
              </p>
            </div>

            <div id="step-login-password" className={`step ${currentStep === 'loginPassword' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${loginPassword ? 'has-value' : ''}`}>
                <PasswordInput
                  id="login-password"
                  placeholder="Password"
                  required
                  minLength={6}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
                <PrimaryButton ariaLabel="Sign in" onClick={handleLoginSubmit}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <button
                type="button"
                id="back-to-login-email"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('loginEmail')}
              >
                ← Back
              </button>
            </div>

            <div id="step-password" className={`step ${currentStep === 'password' ? 'active' : ''} space-y-6`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${password ? 'has-value' : ''}`}>
                <PasswordInput
                  id="password"
                  placeholder="Create password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handlePasswordContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              
              <PasswordStrengthIndicator password={password} />
              
              
              <button
                type="button"
                id="back-to-last-name"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('lastName')}
              >
                ← Back
              </button>
            </div>

            <div id="step-confirm" className={`step ${currentStep === 'confirm' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${confirmPassword ? 'has-value' : ''}`}>
                <PasswordInput
                  id="confirm"
                  placeholder="Confirm password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleConfirmContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-center" style={{ color: '#FF3B30' }}>
                  Passwords don't match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-sm text-center" style={{ color: '#34C759' }}>
                  Passwords match
                </p>
              )}
              
              <button
                type="button"
                id="back-to-password"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('password')}
              >
                ← Back
              </button>
            </div>

            <div id="step-otp" className={`step ${currentStep === 'otp' ? 'active' : ''} space-y-8`}>
              {showRateLimitScreen ? (
                <div className="otp-cooldown animate-on-load delay-4">
                  <h4>Too many attempts</h4>
                  <p>
                    Please try again later.
                  </p>
                  {cooldownLevel >= 2 && (
                    <p style={{ marginTop: '12px' }}>
                      Or <a href="#">contact support</a> for help.
                    </p>
                  )}
                  <p className="dismiss-countdown">
                    Returning in {rateLimitDismissCountdown}s...
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-3 animate-on-load delay-4">
                    <h3 className="text-2xl font-semibold tracking-tight">Verify your email</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to{' '}
                      <span id="otp-email" className="font-semibold text-foreground">
                        {email || 'your email'}
                      </span>
                    </p>
                    <button
                      type="button"
                      id="edit-email"
                      className="text-sm text-foreground underline underline-offset-4 transition"
                      onClick={handleEditEmail}
                    >
                      Edit Email
                    </button>
                  </div>
                  
                  <div className={`flex justify-center gap-3 ${isOtpBlocked ? 'otp-blocked' : ''}`} onPaste={isOtpBlocked ? undefined : handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={`otp-${index}`}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        autoComplete={index === 0 ? 'one-time-code' : undefined}
                        baseClassName={`otp-input ${isOtpBlocked ? 'otp-input-disabled' : ''}`}
                        value={digit}
                        onChange={(event) => !isOtpBlocked && handleOtpChange(event.target.value, index)}
                        onKeyDown={(event) => !isOtpBlocked && handleOtpKeyDown(event, index)}
                        disabled={isOtpBlocked}
                        ref={(el) => {
                          otpRefs.current[index] = el;
                        }}
                      />
                    ))}
                  </div>
                  
                  
                  {otpAttempts > 0 && otpAttempts < MAX_OTP_ATTEMPTS && (
                    <p className="otp-attempts">
                      {MAX_OTP_ATTEMPTS - otpAttempts} attempts remaining
                    </p>
                  )}
                  
                  {otpAttempts >= MAX_OTP_ATTEMPTS && (
                    <p className="otp-error">
                      Maximum attempts reached. Request a new code.
                    </p>
                  )}
                  
                  <div className="text-center">
                    <button
                      type="button"
                      className="otp-resend-btn"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                    >
                      {resendCooldown > 0 
                        ? `Resend in ${resendCooldown}s` 
                        : 'Resend Code'}
                    </button>
                    {resendAttempts > 0 && resendAttempts < MAX_RESEND_ATTEMPTS && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {MAX_RESEND_ATTEMPTS - resendAttempts} resend attempts remaining
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </form>

          <div className="text-center text-xs text-muted-foreground space-y-2 pt-6 animate-on-load delay-5">
            <p>
              By continuing, you agree to our{' '}
              <a href="#" className="underline hover:text-foreground transition">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="underline hover:text-foreground transition">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      <div id="toast" className={`toast ${toast.visible ? 'show' : ''}`} role="status" aria-live="polite" aria-atomic="true">
        <div id="toast-message" className="toast-message">
          {toast.message}
        </div>
      </div>
    </>
  );
};

export default AuthForm;
