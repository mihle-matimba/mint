import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Home", path: "/home", icon: "🏠" },
  { label: "Credit", path: "/credit", icon: "💳" },
  { label: "Invest", path: "/invest", icon: "📈" },
  { label: "Transact", path: "/transact", icon: "➕" },
  { label: "Rewards", path: "/rewards", icon: "🎁" },
  { label: "More", path: "/more", icon: "⋯" },
];

const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                isActive ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
