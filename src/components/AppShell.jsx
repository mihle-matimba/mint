import { Outlet } from "react-router-dom";
import BottomNavBar from "./BottomNavBar.jsx";

const AppShell = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto w-full max-w-lg px-6 pb-24 pt-8">
        <Outlet />
      </main>
      <BottomNavBar />
    </div>
  );
};

export default AppShell;
