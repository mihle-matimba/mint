import React from "react";

const CreditApplyPage = ({ onStartTruID }) => (
  <div className="min-h-screen bg-white px-6 pt-16">
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Credit Apply</h1>
        <p className="mt-2 text-sm text-slate-600">
          Connect your bank account to verify your income and complete your application.
        </p>
      </div>

      <button
        type="button"
        onClick={onStartTruID}
        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
      >
        Connect Bank (Step 1)
      </button>
    </div>
  </div>
);

export default CreditApplyPage;
