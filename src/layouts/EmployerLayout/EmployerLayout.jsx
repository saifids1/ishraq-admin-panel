import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import EmployerSidebar from "./EmployerSidebar";
import EmployerHeader from "./EmployerHeader";

const EmployerLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Stop the page behind the overlay from scrolling while the menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen min-w-0 overflow-hidden bg-gray-50">
      {/* SIDEBAR (hidden on mobile unless opened) */}
      <EmployerSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* RIGHT SIDE */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <EmployerHeader onMenuClick={() => setMobileOpen(true)} />

        {/* PAGE CONTENT */}
        <main className="min-w-0 flex-1 overflow-auto lg:p-3 p-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployerLayout;