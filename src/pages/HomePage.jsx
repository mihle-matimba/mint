import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Search,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Wallet,
  ArrowDownCircle,
  Zap,
  PieChart,
  Globe,
  ChevronLeft,
  ArrowUpRight
} from "lucide-react";

const HomePage = () => {
  const [greeting, setGreeting] = useState("");
  const [activeCard, setActiveCard] = useState(0);
  const [meterTab, setMeterTab] = useState("score");

  // Transaction/Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const userName = "Riyad";
  const accountType = "MINT Private Wealth";

  const meterData = {
    score: { value: 803, label: "MINT Score", percent: 80, note: "+6 pts increase this month" },
    util: { value: "42%", label: "Utilisation", percent: 42, note: "R42,000 of R100,000 Facility" },
    loans: { value: 5, label: "Active Loans", percent: 62, note: "Next repayment: 01 Feb 2026" }
  };

  const transactions = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    name: i % 3 === 0 ? "MINT Deposit" : i % 3 === 1 ? "Portfolio Rebalance" : "Loan Repayment",
    desc: i % 3 === 0 ? "Invest Pillar" : i % 3 === 1 ? "Transact Pillar" : "Borrow Pillar",
    amt: i % 3 === 0 ? `+R${(2000 + i * 100).toLocaleString()}` : `-R${(400 + i * 50).toLocaleString()}`,
    color: i % 3 === 0 ? "text-emerald-600" : i % 3 === 1 ? "text-rose-600" : "text-slate-900"
  }));

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const filteredTx = transactions.filter(
    (tx) => tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTx.length / itemsPerPage);
  const currentTx = filteredTx.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white selection:bg-[#5c3bcf]/10">
      {/* 1. ANIMATED AURORA BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, 60, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] h-[70%] w-[90%] rounded-full bg-[#31005e]/10 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, -40, 0], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] h-[60%] w-[80%] rounded-full bg-[#5c3bcf]/10 blur-[100px]"
        />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-lg flex-col gap-6 px-6 pt-12 overflow-y-auto no-scrollbar pb-32">
        {/* HEADER: SEMIBOLD/LIGHT FONT */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#31005e] shadow-lg border-2 border-white overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100"
                className="h-full w-full object-cover"
                alt={userName}
              />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 leading-none">{greeting}, {userName}</p>
              <p className="text-xs font-light text-[#5c3bcf] mt-1">{accountType}</p>
            </div>
          </div>
          <button className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm border border-slate-100">
            <Bell size={20} className="text-slate-600" />
          </button>
        </header>

        {/* URGENT NOTIFICATIONS */}
        <section className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 p-4 shadow-sm border border-slate-100 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5c3bcf]/10 text-[#5c3bcf]">
              <ShieldCheck size={20} />
            </div>
            <div className="max-w-[200px]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Incomplete/urgent actions</p>
              <p className="text-xs font-semibold text-slate-700 leading-tight">Enable FaceID to secure your MINT environment.</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </section>

        {/* REDESIGNED WEALTH CARDS: Rectangular / 2xl Corners */}
        <div className="relative w-full">
          <AnimatePresence mode="wait">
            {activeCard === 0 ? (
              /* CARD 1: INVESTED CAPITAL (MINT GOLD ACCENTS) */
              <motion.div
                key="card-invest"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="aspect-[1.58/1] w-full rounded-2xl bg-gradient-to-br from-[#31005e] via-[#4c1d95] to-[#31005e] p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex justify-between items-start z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.15em]">Invested Capital</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-emerald-400">+R3 468 Today</span>
                      <ArrowUpRight size={14} className="text-emerald-400" />
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-[#ddc357]/10 text-[9px] font-semibold text-[#ddc357] border border-[#ddc357]/20 uppercase tracking-[0.1em]">Gold Tier</span>
                </div>

                <div className="z-10">
                  <h2 className="text-4xl font-semibold text-white tracking-tight leading-none">R8 834</h2>
                  <div className="mt-4 flex items-center gap-2">
                    <p className="text-[10px] font-light text-white/40 uppercase tracking-widest">Available Funds:</p>
                    <p className="text-lg font-semibold text-white/90">R21 324</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 z-10">
                  <button className="py-3.5 rounded-xl bg-[#ddc357] text-[#31005e] font-semibold text-xs active:scale-95 transition-transform shadow-lg">View Portfolio</button>
                  <button className="py-3.5 rounded-xl bg-white/10 text-white font-semibold text-xs border border-white/10 backdrop-blur-md">Withdrawal</button>
                </div>
              </motion.div>
            ) : (
              /* FIXED CARD 2: MINT SCORE (BORROW PILLAR / GOLD INTELLIGENCE) */
              <motion.div
                key="card-score"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="aspect-[1.58/1] w-full rounded-2xl bg-slate-950 p-7 shadow-2xl relative overflow-hidden flex flex-col border border-white/5"
              >
                {/* 1. Header Navigation */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-full border border-white/10 z-10 self-center">
                  {['score', 'util', 'loans'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setMeterTab(t)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-wider transition-all ${
                        meterTab === t ? "bg-[#ddc357] text-[#31005e] shadow-lg" : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* 2. Visual Meter Section */}
                <div className="relative w-full flex flex-col items-center flex-1 z-10 mt-1">
                  <svg viewBox="0 0 400 150" className="w-full h-24">
                    <path
                      d="M80 130 A120 120 0 0 1 320 130"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    <motion.path
                      d="M80 130 A120 120 0 0 1 320 130"
                      fill="none"
                      stroke="#ddc357"
                      strokeWidth="16"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "0 400" }}
                      animate={{ strokeDasharray: `${(meterData[meterTab].percent / 100) * 400} 400` }}
                      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                  <div className="absolute top-2 text-center">
                    <p className="text-4xl font-semibold text-white tracking-tight leading-none">{meterData[meterTab].value}</p>
                    <p className="text-[10px] font-light text-white/50 uppercase tracking-[0.2em] mt-1">{meterData[meterTab].label}</p>
                  </div>
                  {/* Contextual Note - Positioned below the gauge to avoid overlap */}
                  <div className="mt-2 py-1 px-3 rounded-full bg-white/5 border border-white/5">
                    <p className="text-[9px] font-semibold text-[#ddc357] tracking-tight uppercase">{meterData[meterTab].note}</p>
                  </div>
                </div>

                {/* 3. Footer Action */}
                <button className="w-full py-3 rounded-xl bg-white/5 text-white border border-white/10 font-semibold text-[10px] active:scale-95 transition-transform z-10 uppercase tracking-[0.15em] mt-2">Manage Credit Facility</button>

                {/* Subtle Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 bg-[#ddc357]/5 blur-[60px] rounded-full pointer-events-none" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
            <button
              onClick={() => setActiveCard(0)}
              className={`h-1.5 rounded-full transition-all ${activeCard === 0 ? "w-5 bg-[#31005e]" : "w-1.5 bg-slate-200"}`}
            />
            <button
              onClick={() => setActiveCard(1)}
              className={`h-1.5 rounded-full transition-all ${activeCard === 1 ? "w-5 bg-[#31005e]" : "w-1.5 bg-slate-200"}`}
            />
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <section className="mt-12 grid grid-cols-4 gap-4 px-2">
          {[
            { label: "Invest", icon: <TrendingUp size={24} /> },
            { label: "Repay", icon: <Wallet size={24} /> },
            { label: "Deposit", icon: <ArrowDownCircle size={24} /> },
            { label: "Withdraw", icon: <Zap size={24} /> },
          ].map((action) => (
            <button key={action.label} className="flex flex-col items-center gap-2 group">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 transition-active active:bg-white active:shadow-md active:scale-90 transition-all">
                {action.icon}
              </div>
              <span className="text-[11px] font-medium text-slate-700 tracking-tight">{action.label}</span>
            </button>
          ))}
        </section>

        {/* MARKET INTELLIGENCE NEWS FEED */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Market Intelligence</h3>
            <button className="text-xs font-semibold text-[#5c3bcf] uppercase">Market Pulse</button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {[
              { title: "Suitability Shifts in SA markets.", tag: "Invest", icon: Globe },
              { title: "Credit through assets.", tag: "Borrow", icon: Zap }
            ].map((news, i) => (
              <div
                key={i}
                className="min-w-[280px] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex gap-4 items-center"
              >
                <div className="h-12 w-12 rounded-xl bg-[#31005e]/5 flex items-center justify-center text-[#31005e]">
                  <news.icon size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">{news.title}</p>
                  <p className="text-[10px] font-semibold text-[#5c3bcf] mt-1.5 uppercase tracking-widest">{news.tag} Pillar</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION: PAGINATED LATEST TRANSACTIONS */}
        <section className="mt-8 space-y-6 pb-20">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest">Latest Transactions</h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Page {currentPage} of {totalPages}</p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search MINT history..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-3.5 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-100 text-xs focus:outline-none focus:border-[#5c3bcf]/20 transition-all"
            />
          </div>

          <div className="space-y-1">
            {currentTx.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between items-center p-4 rounded-2xl border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <div className="flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-lg bg-[#31005e]/5 flex items-center justify-center text-[10px] font-semibold text-[#31005e]">M</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{tx.name}</p>
                    <p className="text-[10px] text-slate-400 font-light uppercase tracking-widest">{tx.desc}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${tx.color}`}>{tx.amt}</p>
              </div>
            ))}
          </div>

          {/* Pagination Controls - 5 items per page */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 disabled:opacity-20 transition-opacity"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 text-xs font-semibold text-[#31005e] disabled:opacity-20 transition-opacity"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomePage;
