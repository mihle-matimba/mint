import type { ElementType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CircleDollarSign,
  CreditCard,
  PiggyBank,
  Send,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type TransactRadialMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

const actions = [
  { label: "Invest", path: "/invest", icon: PiggyBank },
  { label: "Pay", path: "/pay", icon: Send },
  { label: "Add Money", path: "/add-money", icon: CircleDollarSign },
  { label: "Credit", path: "/credit", icon: CreditCard },
  { label: "Claim Rewards", path: "/rewards", icon: BadgeCheck },
];

const panelVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.85 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 220, damping: 18 },
  },
  exit: { opacity: 0, y: 40, scale: 0.9, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.6, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: 0.08 * index,
      type: "spring",
      stiffness: 260,
      damping: 16,
    },
  }),
  exit: { opacity: 0, scale: 0.8, y: 12, transition: { duration: 0.2 } },
};

const TransactRadialMenu = ({ isOpen, onClose }: TransactRadialMenuProps) => {
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 px-6 pb-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-[2rem] bg-slate-900/95 px-6 pb-8 pt-10 shadow-2xl shadow-black/50"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute right-5 top-5">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/60 bg-slate-800/80 text-slate-200 transition hover:border-amber-300 hover:text-amber-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-8 text-center">
              <h2 className="text-lg font-semibold text-white">
                Choose an action
              </h2>
              <p className="text-sm text-slate-400">
                Quick access to your most-used tasks
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex justify-center">
                <ActionButton
                  action={actions[0]}
                  index={0}
                  onSelect={handleAction}
                />
              </div>
              <div className="flex justify-between">
                <ActionButton
                  action={actions[1]}
                  index={1}
                  onSelect={handleAction}
                />
                <ActionButton
                  action={actions[2]}
                  index={2}
                  onSelect={handleAction}
                />
              </div>
              <div className="flex justify-between">
                <ActionButton
                  action={actions[3]}
                  index={3}
                  onSelect={handleAction}
                />
                <ActionButton
                  action={actions[4]}
                  index={4}
                  onSelect={handleAction}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

type Action = {
  label: string;
  path: string;
  icon: ElementType;
};

type ActionButtonProps = {
  action: Action;
  index: number;
  onSelect: (path: string) => void;
};

const ActionButton = ({ action, index, onSelect }: ActionButtonProps) => {
  const Icon = action.icon;

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      onClick={() => onSelect(action.path)}
      className="flex flex-col items-center gap-3"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-200 text-slate-900 shadow-lg shadow-amber-200/30">
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-sm font-medium text-slate-100">
        {action.label}
      </span>
    </motion.button>
  );
};

export default TransactRadialMenu;
