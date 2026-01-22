import React, { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const IconBase = ({ children, className, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props} className={className}>
    {children}
  </svg>
);

const HomeIcon = (props) => (
  <IconBase {...props}>
    <path d="M3 11.5L12 4l9 7.5" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 10.5V20h13V10.5" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const CreditIcon = (props) => (
  <IconBase {...props}>
    <rect x="3" y="6.5" width="18" height="11" rx="2" strokeWidth={1.6} />
    <path d="M3 10h18" strokeWidth={1.6} strokeLinecap="round" />
  </IconBase>
);

const PlusIcon = (props) => (
  <IconBase {...props}>
    <path d="M12 5v14" strokeWidth={2} strokeLinecap="round" />
    <path d="M5 12h14" strokeWidth={2} strokeLinecap="round" />
  </IconBase>
);

const PieIcon = (props) => (
  <IconBase {...props}>
    <path d="M12 3v9h9" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 3a9 9 0 1 0 9 9" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const MoreIcon = (props) => (
  <IconBase {...props}>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
  </IconBase>
);

const ArrowDownIcon = (props) => (
  <IconBase {...props}>
    <path d="M12 4v12" strokeWidth={1.6} strokeLinecap="round" />
    <path d="M7.5 12.5L12 17l4.5-4.5" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const WalletIcon = (props) => (
  <IconBase {...props}>
    <path d="M4 8.5h14.5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4z" strokeWidth={1.6} />
    <path d="M4 8.5V7a2 2 0 0 1 2-2h12" strokeWidth={1.6} />
    <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" />
  </IconBase>
);

const TrendingUpIcon = (props) => (
  <IconBase {...props}>
    <path d="M4.5 15l5-5 4 4 6-6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 8h5v5" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const ZapIcon = (props) => (
  <IconBase {...props}>
    <path d="M13 2L5 13h6l-1 9 8-11h-6z" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const GiftIcon = (props) => (
  <IconBase {...props}>
    <path d="M4 11h16v9H4z" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M12 11v9" strokeWidth={1.6} />
    <path d="M4 11h16V8H4z" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M7.5 8a2.5 2.5 0 1 1 4.5-1.5" strokeWidth={1.6} strokeLinecap="round" />
    <path d="M16.5 8a2.5 2.5 0 1 0-4.5-1.5" strokeWidth={1.6} strokeLinecap="round" />
  </IconBase>
);
 
const Navbar = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [wheelCenter, setWheelCenter] = useState({ x: 0, y: 0 });
  const plusButtonRef = useRef(null);
 
  const tabs = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "credit", label: "Credit", icon: CreditIcon },
    { id: "transact", label: "Transact", icon: PlusIcon, isCenter: true },
    { id: "investments", label: "Investments", icon: PieIcon },
    { id: "more", label: "More", icon: MoreIcon },
  ];
 
  const transactActions = [
    { id: "deposit", label: "Deposit", icon: ArrowDownIcon, angle: -180 },
    { id: "payLoan", label: "Pay loan", icon: WalletIcon, angle: -135 },
    { id: "invest", label: "Invest", icon: TrendingUpIcon, angle: -90 },
    { id: "credit", label: "Credit", icon: ZapIcon, angle: -45 },
    { id: "rewards", label: "Rewards", icon: GiftIcon, angle: 0 },
  ];
 
  // The radius you specifically requested
  const radius = 145;
 
  const updateWheelCenter = () => {
    if (plusButtonRef.current) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setWheelCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  };
 
  useLayoutEffect(() => {
    updateWheelCenter();
    window.addEventListener("resize", updateWheelCenter);
    return () => window.removeEventListener("resize", updateWheelCenter);
  }, []);
 
  return (
    <>
      {/* 1-2. Backdrop Blur + Rotating Menu Items */}
      {createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 pointer-events-auto bg-black/10 backdrop-blur-[8px]"
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ rotate: -180, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 180, opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 100, damping: 22 }}
                className="fixed pointer-events-none"
                style={{
                  left: wheelCenter.x,
                  top: wheelCenter.y,
                  width: 0,
                  height: 0,
                }}
              >
                {transactActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      if(action.id === "invest") setActiveTab("investments");
                      setIsOpen(false);
                    }}
                    className="absolute flex items-center justify-center group pointer-events-auto"
                    style={{
                      left: `${Math.cos(action.angle * (Math.PI / 180)) * radius}px`,
                      top: `${Math.sin(action.angle * (Math.PI / 180)) * radius}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="glass flex h-20 w-20 flex-col items-center justify-center gap-1.5 border border-white/40 bg-white/30 shadow-2xl transition-all duration-300 group-active:scale-95 group-hover:bg-white/50">
                      <motion.div
                        initial={{ rotate: 180 }}
                        animate={{ rotate: 0 }}
                        exit={{ rotate: -180 }}
                        transition={{ type: "spring", stiffness: 100, damping: 22 }}
                        className="flex flex-col items-center"
                      >
                        <action.icon size={22} strokeWidth={1.2} className="text-slate-800" />
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-700">
                          {action.label}
                        </span>
                      </motion.div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
 
      {/* 3. Bottom Navbar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[1000] border-t border-white/20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 transition-all duration-500 ${
          isOpen ? "bg-white/80 backdrop-blur-3xl" : "bg-white/70 backdrop-blur-2xl"
        }`}
      >
        <div className="relative mx-auto flex w-full max-w-lg items-center justify-between px-4">
          <div className="nav-items contents" data-open={isOpen}>
            {tabs.slice(0, 2).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsOpen(false); }}
                  className={`flex flex-1 flex-col items-center justify-center gap-1 leading-none transition-[filter,opacity] duration-[180ms] ease-in-out ${
                    isActive ? "text-indigo-600 scale-110" : "text-slate-400 opacity-60"
                  } ${isOpen ? "blur-[2px] opacity-60" : ""}`}
                >
                  <tab.icon size={20} strokeWidth={isActive ? 1.8 : 1.2} />
                  <span className="text-[8px] font-black uppercase tracking-[0.1em]">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-1 items-center justify-center">
            <button
              ref={plusButtonRef}
              onClick={() => {
                updateWheelCenter();
                setIsOpen(!isOpen);
              }}
              className={`relative z-[90] flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition-all active:scale-90 ${
                isOpen ? "blur-none opacity-100" : ""
              }`}
            >
              <motion.div animate={{ rotate: isOpen ? 135 : 0 }}>
                <PlusIcon className="h-7 w-7" />
              </motion.div>
            </button>
          </div>
          <div className="nav-items contents" data-open={isOpen}>
            {tabs.slice(3).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsOpen(false); }}
                  className={`flex flex-1 flex-col items-center justify-center gap-1 leading-none transition-[filter,opacity] duration-[180ms] ease-in-out ${
                    isActive ? "text-indigo-600 scale-110" : "text-slate-400 opacity-60"
                  } ${isOpen ? "blur-[2px] opacity-60" : ""}`}
                >
                  <tab.icon size={20} strokeWidth={isActive ? 1.8 : 1.2} />
                  <span className="text-[8px] font-black uppercase tracking-[0.1em]">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};
 
export default Navbar;
