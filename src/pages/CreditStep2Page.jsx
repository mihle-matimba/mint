import React, { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useCreditCheck } from "../lib/useCreditCheck";

const contractOptions = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "PERMANENT_ON_PROBATION", label: "Permanent on probation" },
  { value: "FIXED_TERM_12_PLUS", label: "Fixed term (≥ 12 months)" },
  { value: "FIXED_TERM_LT_12", label: "Fixed term (< 12 months)" },
  { value: "SELF_EMPLOYED_12_PLUS", label: "Self employed (≥ 12 months)" },
  { value: "PART_TIME", label: "Part time" },
  { value: "UNEMPLOYED_OR_UNKNOWN", label: "Unemployed / Unknown" }
];

const sectorOptions = [
  { value: "government", label: "Government" },
  { value: "private", label: "Private" },
  { value: "listed", label: "Listed company" },
  { value: "other", label: "Other" }
];

const formatCurrency = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "--";
  return numberValue.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
};

const getResultValue = (value) => (value === null || value === undefined ? "--" : value);

const SectionCard = ({ title, children, subtitle }) => (
  <section className="rounded-3xl bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
        {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

export default function CreditStep2Page({ onBack }) {
  const {
    form,
    setField,
    normalizedContractType,
    profile,
    snapshot,
    loadingProfile,
    intakeError,
    locked,
    lockInputs,
    editInputs,
    engineResult,
    engineStatus,
    runEngine,
    mockMode,
    employerCsv,
    warnings,
    proceedToStep3,
    isUpdatingLoan
  } = useCreditCheck();

  const employerOptions = useMemo(() => {
    if (!employerCsv?.length) return [];
    return employerCsv
      .map((row) => row.split(";")[0])
      .filter(Boolean)
      .slice(0, 200);
  }, [employerCsv]);

  const exposure = engineResult?.creditExposure || {};
  const breakdown = engineResult?.breakdown || {};
  const employmentHistory = engineResult?.employmentHistory || [];
  const scoreReasons = engineResult?.scoreReasons || [];

  const retdata = engineResult?.raw?.retdata || engineResult?.raw?.retData || engineResult?.raw?.retDataZip || null;

  const handleDownloadRetdata = () => {
    if (!retdata) return;
    const binary = atob(retdata);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/zip" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "experian-retdata.zip";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-10 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Credit
          </button>
          <h1 className="text-2xl font-semibold">Step 2 · Credit Assessment</h1>
          <p className="text-sm text-white/80">
            Confirm applicant details and run the Experian credit assessment engine. Lock inputs before starting.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-8 flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 md:px-8">
        <SectionCard title="Profile summary" subtitle="Loaded from Supabase">
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">ID Number</p>
              <p className="font-semibold">{profile?.id_number || "--"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Full name</p>
              <p className="font-semibold">
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Monthly income</p>
              <p className="font-semibold">{snapshot?.avg_monthly_income ? formatCurrency(snapshot.avg_monthly_income) : "--"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Monthly expenses</p>
              <p className="font-semibold">{snapshot?.avg_monthly_expenses ? formatCurrency(snapshot.avg_monthly_expenses) : "--"}</p>
            </div>
          </div>
          {loadingProfile && <p className="text-xs text-slate-500">Loading profile...</p>}
          {!!warnings.length && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Applicant inputs" subtitle="Update anything before locking inputs.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs text-slate-500">ID Number</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.identityNumber}
                onChange={(e) => setField("identityNumber", e.target.value)}
                disabled={locked}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">First name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                disabled={locked}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Surname</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                disabled={locked}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Gender</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value)}
                disabled={locked}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Date of birth</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
                placeholder="YYYY-MM-DD"
                disabled={locked}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-xs text-slate-500">Address</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                disabled={locked}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Annual income (R)</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.annualIncome}
                onChange={(e) => setField("annualIncome", e.target.value)}
                type="number"
                disabled={locked}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Annual expenses (R)</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.annualExpenses}
                onChange={(e) => setField("annualExpenses", e.target.value)}
                type="number"
                disabled={locked}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Years with current employer</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.yearsCurrentEmployer}
                onChange={(e) => setField("yearsCurrentEmployer", e.target.value)}
                type="number"
                step="0.1"
                disabled={locked}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Contract type</span>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.contractType}
                onChange={(e) => setField("contractType", e.target.value)}
                disabled={locked}
              >
                <option value="" disabled>Choose contract type</option>
                {contractOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">Normalized: {normalizedContractType || "--"}</p>
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">New borrower?</span>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.isNewBorrower}
                onChange={(e) => setField("isNewBorrower", e.target.value)}
                disabled={locked}
              >
                <option value="" disabled>Select option</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Employment sector</span>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.employmentSector}
                onChange={(e) => setField("employmentSector", e.target.value)}
                disabled={locked}
              >
                <option value="" disabled>Select sector</option>
                {sectorOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-xs text-slate-500">Employer name</span>
              <input
                list={form.employmentSector === "listed" ? "listed-employers" : undefined}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
                value={form.employerName}
                onChange={(e) => setField("employerName", e.target.value)}
                disabled={locked}
                placeholder={form.employmentSector === "listed" ? "Search listed company" : "Employer name"}
              />
              {form.employmentSector === "listed" && employerOptions.length > 0 && (
                <datalist id="listed-employers">
                  {employerOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              )}
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!locked ? (
              <button
                type="button"
                onClick={lockInputs}
                className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
              >
                Lock inputs
              </button>
            ) : (
              <button
                type="button"
                onClick={editInputs}
                className="rounded-full border border-slate-300 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
              >
                Edit inputs
              </button>
            )}
            {intakeError && <p className="text-xs text-rose-600">{intakeError}</p>}
          </div>
        </SectionCard>

        <SectionCard title="Engine" subtitle="Run the Experian credit check and loan engine.">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
              <p className="text-lg font-semibold text-slate-900">{engineStatus}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mock mode</p>
              <p className="text-lg font-semibold text-slate-900">{mockMode === null ? "Unknown" : String(mockMode)}</p>
            </div>
            <button
              type="button"
              onClick={runEngine}
              disabled={!locked}
              className="rounded-full bg-emerald-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-50"
            >
              Start engine
            </button>
            {retdata && (
              <button
                type="button"
                onClick={handleDownloadRetdata}
                className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
              >
                Download report zip
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">Loan engine score</p>
              <p className="text-xl font-semibold text-slate-900">{getResultValue(engineResult?.loanEngineScoreNormalized ?? engineResult?.loanEngineScore)}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">Credit score</p>
              <p className="text-xl font-semibold text-slate-900">{getResultValue(engineResult?.creditScore)}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">Recommendation</p>
              <p className="text-xl font-semibold text-slate-900">{engineResult?.recommendation || "--"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Breakdown</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(breakdown).map(([key, item]) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-semibold">{getResultValue(item?.contributionPercent)}</span>
                </div>
              ))}
              {!Object.keys(breakdown).length && <p className="text-slate-500">No breakdown yet.</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Exposure</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p>Total balance: {formatCurrency(exposure.totalBalance)}</p>
                <p>Total limits: {formatCurrency(exposure.totalLimits)}</p>
                <p>Revolving balance: {formatCurrency(exposure.revolvingBalance)}</p>
                <p>Revolving limits: {formatCurrency(exposure.revolvingLimits)}</p>
                <p>Monthly installments: {formatCurrency(exposure.totalMonthlyInstallment)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score reasons</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                {scoreReasons.length ? scoreReasons.map((reason) => <p key={reason}>• {reason}</p>) : <p>No reasons yet.</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Employment history</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {employmentHistory.length ? employmentHistory.map((entry, index) => (
                <div key={`${entry?.employerName || entry?.employer || "emp"}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="font-semibold">{entry?.employerName || entry?.employer || "Employer"}</p>
                  <p className="text-xs text-slate-500">{entry?.occupation || entry?.title || "Role"}</p>
                </div>
              )) : <p>No employment history returned.</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={proceedToStep3}
              disabled={!engineResult || isUpdatingLoan}
              className="rounded-full bg-slate-900 px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-50"
            >
              {isUpdatingLoan ? "Updating..." : "Proceed to Step Three"}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
