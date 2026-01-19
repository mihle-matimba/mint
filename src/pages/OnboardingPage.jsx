import React from "react";

const OnboardingPage = ({ onCreateAccount, onLogin }) => {
  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-white flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0">
        <img
          src="/assets/images/onboarding-hero.png"
          alt="Person using a phone"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px]" aria-hidden="true" />
      </div>
      <div className="relative flex w-full max-w-xl flex-col items-center justify-center gap-8 text-center">
        <div className="flex items-center gap-3 animate-on-load delay-1">
          <img src="/assets/mint-logo.svg" alt="Mint logo" className="h-6 w-auto" />
          <span className="mint-brand text-lg font-semibold tracking-[0.12em]">MINT</span>
        </div>

        <div className="space-y-3 animate-on-load delay-2">
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
            Welcome to <span className="mint-brand">Mint</span>
          </h1>
          <p className="text-lg text-slate-600">
            Let’s get your account ready in a few minutes.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4 animate-on-load delay-3 sm:w-auto">
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
          >
            Login
          </button>
          <button
            type="button"
            onClick={onCreateAccount}
            className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
