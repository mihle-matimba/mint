import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import BottomNav from "./BottomNav";
import TransactRadialMenu from "./TransactRadialMenu";

const AppLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
        <Outlet />
      </main>
      <BottomNav
        menuOpen={menuOpen}
        onTransactClick={() => setMenuOpen(true)}
      />
      <TransactRadialMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
};

export default AppLayout;
