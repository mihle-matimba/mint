import React, { useMemo } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import NotificationBell from "../components/NotificationBell";

const CreditComingSoonPage = ({ onBack, onOpenNotifications }) => {
  const localTimeLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-6 text-white md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onBack?.()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
              Portfolio
            </div>
            <NotificationBell onClick={onOpenNotifications} />
          </header>

          <div className="mt-10 grid gap-8 md:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <Sparkles className="h-4 w-4" />
                Credit Suite
              </div>
              <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
                Credit tools are <span className="text-violet-200">coming soon</span>.
              </h1>
              <p className="max-w-xl text-sm text-white/75 md:text-base">
                We are shaping smarter credit limits, repayment insights, and score protection tools so you can
                borrow with confidence and grow responsibly.
              </p>

              <div className="glass-card space-y-4 p-5 text-white">
                <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  Connecting your credit orbit
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                    <span>Credit application</span>
                    <span>Step 2 of 4</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                    <div className="h-2 w-1/2 rounded-full bg-gradient-to-r from-white to-violet-200" />
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Monthly income</p>
                      <p className="mt-2 text-sm font-semibold text-white">R 32,000</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Employer</p>
                      <p className="mt-2 text-sm font-semibold text-white">MINT Labs</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Requested limit</p>
                      <p className="mt-2 text-sm font-semibold text-white">R 6,500</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/20 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>Estimated approval</span>
                      <span className="text-white">86%</span>
                    </div>
                    <p className="mt-2 text-xs text-white/60">
                      Submit in under 2 minutes with bank sync and proof of income.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
                >
                  Notify me
                </button>
                <p className="text-xs text-white/60">Local time: {localTimeLabel}</p>
              </div>
            </section>

            <section className="flex flex-col items-center justify-start gap-6 rounded-3xl border border-white/15 bg-white/10 p-6 text-white backdrop-blur">
              <img src="/assets/mint-logo.svg" alt="Mint logo" className="h-16 w-16" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">MINT CREDIT</p>
                <p className="mt-3 text-sm text-white/75">
                  Your personalized credit view will live here, with limits, usage insights, and repayment alerts.
                </p>
              </div>
              <div className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-left text-xs text-white/70">
                <p className="font-semibold text-white">Preview</p>
                <p className="mt-2">Credit score trends, repayment plans, and utilization guardrails.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditComingSoonPage;
