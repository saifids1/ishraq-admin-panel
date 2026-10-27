import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { StatusModalProvider } from "../../components/common/StatusModalProvider";

const AdminLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <StatusModalProvider>
      <div className="flex h-screen min-w-0 overflow-hidden bg-gray-50">
        <div className="hidden shrink-0 md:flex">
          <AdminSidebar />
        </div>

        <div className="md:hidden">
          <AdminSidebar
            isMobile
            open={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader onOpenMenu={() => setMobileSidebarOpen(true)} />

          <main className="min-w-0 flex-1 overflow-auto p-3 sm:p-4 lg:p-3">
            <Outlet />
          </main>
        </div>
      </div>
    </StatusModalProvider>
  );
};

export default AdminLayout;
