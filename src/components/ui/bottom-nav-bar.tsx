import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Home,
  LineChart,
  MessageCircle,
  Trophy,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: Home },
  { label: "Portfolio", icon: LineChart },
  { label: "Transactions", icon: CreditCard },
  { label: "Messages", icon: MessageCircle },
  { label: "Rewards", icon: Trophy },
  { label: "Profile", icon: User },
];

const MOBILE_LABEL_WIDTH = 72;

type BottomNavBarProps = {
  className?: string;
  defaultIndex?: number;
  stickyBottom?: boolean;
};

export function BottomNavBar({
  className,
  defaultIndex = 0,
  stickyBottom = true,
}: BottomNavBarProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  return (
    <motion.nav
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Bottom Navigation"
      className={cn(
        "flex h-[56px] min-w-[320px] max-w-[95vw] items-center space-x-1 rounded-full border border-slate-200 bg-white p-2 shadow-xl",
        stickyBottom &&
          "fixed inset-x-0 bottom-4 z-20 mx-auto w-fit shadow-2xl",
        className
      )}
    >
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx;

        return (
          <motion.button
            key={item.label}
            whileTap={{ scale: 0.97 }}
            className={cn(
              "relative flex h-10 min-h-[40px] min-w-[44px] max-h-[44px] items-center gap-0 rounded-full px-3 py-2 transition-colors duration-200",
              isActive
                ? "bg-slate-900/10 text-slate-900 gap-2"
                : "bg-transparent text-slate-500 hover:bg-slate-100",
              "focus:outline-none focus-visible:ring-0"
            )}
            onClick={() => setActiveIndex(idx)}
            aria-label={item.label}
            type="button"
          >
            <Icon
              size={22}
              strokeWidth={2}
              aria-hidden
              className="transition-colors duration-200"
            />

            <motion.div
              initial={false}
              animate={{
                width: isActive ? `${MOBILE_LABEL_WIDTH}px` : "0px",
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? "8px" : "0px",
              }}
              transition={{
                width: { type: "spring", stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className="flex max-w-[72px] items-center overflow-hidden"
            >
              <span
                className={cn(
                  "select-none overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.625rem,0.5263rem+0.5263vw,1rem)] text-xs font-medium leading-[1.9] transition-opacity duration-200",
                  isActive ? "text-slate-900" : "opacity-0"
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;
