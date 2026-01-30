import React, { useEffect, useState } from "react";
import CreditMetricCard from "../components/credit/CreditMetricCard.jsx";
import CreditActionGrid from "../components/credit/CreditActionGrid.jsx";
import CreditScorePage from "./CreditScorePage.jsx";
import { supabase } from "../lib/supabase.js";
import { formatZar } from "../lib/formatCurrency";
import { useProfile } from "../lib/useProfile";
import CreditSkeleton from "../components/CreditSkeleton";
import NotificationBell from "../components/NotificationBell";

const defaultCreditOverview = {
  availableCredit: null,
  score: null,
  updatedAt: "Please run your credit check",
  loanBalance: "R8,450",
  nextPaymentDate: "May 30, 2024",
  minDue: "R950",
  utilisationPercent: 62,
};

const CreditPage = ({ onOpenNotifications, onOpenTruID, onOpenCreditStep2 }) => {
  const [view, setView] = useState(() =>
    window.location.pathname === "/credit/score" ? "score" : "overview"
  );
  const [creditOverview, setCreditOverview] = useState(defaultCreditOverview);
  const { profile, loading } = useProfile();
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const handlePopState = () => {
      setView("overview");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const loadScoreAndLoan = async () => {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { data: scoreData } = await supabase
        .from("loan_engine_score")
        .select("engine_score,run_at")
        .eq("user_id", userId)
        .order("run_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: snapshotData } = await supabase
        .from("truid_bank_snapshots")
        .select("net_monthly_income,avg_monthly_income,avg_monthly_expenses")
        .eq("user_id", userId)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: loanData } = await supabase
        .from("loan_application")
        .select("principal_amount,amount_repayable,monthly_repayable,first_repayment_date,status")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setCreditOverview((prev) => {
        const next = { ...prev };
        if (Number.isFinite(scoreData?.engine_score)) {
          next.score = scoreData.engine_score;
          next.updatedAt = "Updated today";
        }

        const netIncome = Number(snapshotData?.net_monthly_income)
          || (Number(snapshotData?.avg_monthly_income) - Number(snapshotData?.avg_monthly_expenses))
          || 0;
        if (Number.isFinite(netIncome) && netIncome > 0) {
          const maxLimit = Math.max(1000, Math.floor(netIncome * 0.2));
          next.availableCredit = formatZar(maxLimit);
        }

        if (loanData?.principal_amount || loanData?.amount_repayable) {
          next.loanBalance = formatZar(Number(loanData.principal_amount) || 0);
          next.nextPaymentDate = loanData.first_repayment_date
            ? new Date(loanData.first_repayment_date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })
            : "—";
          next.minDue = formatZar(Number(loanData.monthly_repayable) || 0);
          next.utilisationPercent = prev.utilisationPercent;
          next.loanStatus = loanData.status || "in_progress";
          next.amountRepayable = formatZar(Number(loanData.amount_repayable) || 0);
        } else {
          next.loanStatus = null;
          next.amountRepayable = null;
        }

        return next;
      });
    };

    loadScoreAndLoan();
  }, []);

  const navigate = (viewName) => {
    const path = viewName === "score" ? "/credit/score" : "/credit";
    window.history.pushState({}, "", path);
    setView(viewName);
  };

  if (view === "score") {
    return <CreditScorePage onBack={() => navigate("overview")} />;
  }

  if (loading) {
    return <CreditSkeleton />;
  }

  const utilisationWidth = `${creditOverview.utilisationPercent}%`;
  const hasScore = Number.isFinite(creditOverview.score) && creditOverview.score > 0;
  const hasAvailableCredit = Boolean(creditOverview.availableCredit);

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <header className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName || "Profile"}
                  className="h-10 w-10 rounded-full border border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
                  {initials || "—"}
                </div>
              )}
            </div>
            <NotificationBell onClick={onOpenNotifications} />
          </header>

          <section className="rounded-3xl bg-white/10 p-5 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Available Credit</p>
            <p className="mt-3 text-3xl font-semibold">
              {hasAvailableCredit ? creditOverview.availableCredit : "Coming soon"}
            </p>
            <div className="mt-4 inline-flex items-center rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">
              Good standing
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-5 px-4 pb-10 md:max-w-md md:px-8">
        <CreditMetricCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Credit Score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {hasScore ? creditOverview.score : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {hasScore ? creditOverview.updatedAt : "Please run your credit check"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("score")}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              {hasScore ? "View score" : "Run credit check"}
            </button>
          </div>
        </CreditMetricCard>

        <CreditMetricCard>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Active loan / Utilisation</p>
            {creditOverview.loanStatus && (
              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                creditOverview.loanStatus.toLowerCase() === "submitted"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {creditOverview.loanStatus.toLowerCase() === "submitted" ? "In review" : creditOverview.loanStatus}
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Principal amount</p>
              <p className="mt-1 font-semibold text-slate-800">{creditOverview.loanBalance}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">First repayment date</p>
              <p className="mt-1 font-semibold text-slate-800">{creditOverview.nextPaymentDate}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Monthly repayable</p>
              <p className="mt-1 font-semibold text-slate-800">{creditOverview.minDue}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Amount repayable</p>
              <p className="mt-1 font-semibold text-slate-800">{creditOverview.amountRepayable || "—"}</p>
            </div>
          </div>

          {!creditOverview.loanStatus && (
            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-emerald-300"
                  style={{ width: utilisationWidth }}
                />
              </div>
            </div>
          )}
        </CreditMetricCard>

        <CreditMetricCard>
          <p className="text-sm font-semibold text-slate-700">Quick Actions</p>
          <p className="mt-1 text-xs text-slate-400">Start your next credit step.</p>
          <div className="mt-4">
            <CreditActionGrid
              actions={[
                {
                  label: "Apply for credit",
                  onClick: () => onOpenTruID ? onOpenTruID() : console.log("Apply for credit"),
                },
                {
                  label: "Upload bank statements",
                  onClick: () => onOpenCreditStep2 ? onOpenCreditStep2() : console.log("Upload bank statements"),
                },
                {
                  label: "Verify identity",
                  onClick: () => console.log("Verify identity"),
                },
                {
                  label: "Pay loan",
                  onClick: () => console.log("Pay loan"),
                },
              ]}
            />
          </div>
        </CreditMetricCard>
      </div>
    </div>
  );
};

export default CreditPage;
