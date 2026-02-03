import React, { useMemo } from "react";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";
import { formatZar } from "../lib/formatCurrency";

const InvestmentsCard = ({ amount = 0, onViewAll }) => {
  const formattedAmount = useMemo(() => formatZar(amount), [amount]);
  const subtitle = amount > 0 ? "21% Previous Month" : "Start investing to build your portfolio.";

  return (
    <div className="overflow-hidden rounded-[32px] bg-gradient-to-b from-[#111111] via-[#2b1b0e] to-[#f5f0e6] p-6 shadow-2xl">
      <div className="flex items-start justify-between text-white">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Account Value</p>
          <p className="mt-2 text-2xl font-semibold">{formattedAmount}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80">
          <Eye className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="rounded-full bg-[#f6c34a] px-3 py-1 text-slate-900 shadow-sm">
          Investments
        </span>
        <span className="rounded-full border border-white/30 px-3 py-1 text-white/80">
          Banking
        </span>
        <span className="rounded-full border border-white/30 px-3 py-1 text-white/80">
          Sales
        </span>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4 text-slate-900">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            Invest
            <ChevronDown className="h-4 w-4 text-slate-700" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{formattedAmount}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-900 shadow-sm">
            W
          </span>
          <span className="text-white/70">M</span>
        </div>
      </div>

      <div className="relative mt-4 h-28">
        <div className="absolute left-[58%] top-2 h-24 w-8 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#f6c34a]/90 to-[#f6c34a]/20" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 320 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0 78 C 40 58, 80 92, 120 70 S 200 40, 240 74 S 300 92, 320 70"
            fill="none"
            stroke="#c7c1b7"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M0 86 C 50 110, 90 60, 140 74 S 220 110, 320 80"
            fill="none"
            stroke="#1b1b1b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="190" cy="50" r="7" fill="#f6c34a" stroke="#111111" strokeWidth="3" />
        </svg>
        <div className="absolute left-[58%] top-0 -translate-x-1/2 rounded-full bg-[#f6c34a] px-2 py-1 text-[10px] font-semibold text-slate-900 shadow-sm">
          $8720
        </div>
      </div>

      <div className="mt-3 flex justify-between text-[11px] text-slate-500">
        {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((day) => (
          <span
            key={day}
            className={
              day === 'Tue'
                ? 'rounded-full bg-white/80 px-2 py-0.5 text-slate-800 shadow-sm'
                : ''
            }
          >
            {day}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        className="mt-5 w-full rounded-full bg-black/10 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-inner"
      >
        View All Investments
        <ChevronRight className="ml-2 inline h-4 w-4" />
      </button>
    </div>
  );
};

export default InvestmentsCard;
