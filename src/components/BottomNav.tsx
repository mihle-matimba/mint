import { motion } from "framer-motion";
import {
  CircleUser,
  CreditCard,
  Home,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

type BottomNavProps = {
  menuOpen: boolean;
  onTransactClick: () => void;
};

const BottomNav = ({ menuOpen, onTransactClick }: BottomNavProps) => {
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/home";

  const linkBase =
    "flex flex-col items-center gap-1 text-xs font-medium transition";
  const inactive = "text-slate-400 hover:text-white";
  const active = "text-amber-300";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-slate-950/95 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-md items-end justify-between px-6">
        <NavLink
          to="/"
          className={`${linkBase} ${isHome ? active : inactive}`}
        >
          <Home className="h-5 w-5" />
          Home
        </NavLink>
        <NavLink
          to="/credit"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? active : inactive}`
          }
        >
          <CreditCard className="h-5 w-5" />
          Credit
        </NavLink>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onTransactClick}
          className="relative -translate-y-6 rounded-full bg-amber-300 px-4 py-4 text-slate-900 shadow-lg shadow-amber-200/30 transition"
        >
          <Sparkles className="h-6 w-6" />
          <span className="mt-2 block text-[0.7rem] font-semibold">
            Transact
          </span>
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-200/70" />
        </motion.button>
        <NavLink
          to="/invest"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? active : inactive}`
          }
        >
          <TrendingUp className="h-5 w-5" />
          Invest
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? active : inactive}`
          }
        >
          <CircleUser className="h-5 w-5" />
          Profile
        </NavLink>
      </div>
      {menuOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-amber-300/70" />
      )}
    </nav>
  );
};

export default BottomNav;
