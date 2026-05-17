import { ReactNode, useState } from "react";
import { X, Menu } from "lucide-react";
import AppSidebar from "./AppSidebar";
import SubscriptionBadge from "./SubscriptionBadge";
import { ThemeToggle } from "./ThemeToggle";
import ProductKeyRedemption from "./ProductKeyRedemption";

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  onSignOut: () => void;
}

const DashboardLayout = ({
  children, pageTitle, userId, userName, userEmail, isAdmin, onSignOut,
}: DashboardLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = (userName || userEmail || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-subtle flex w-full">

      {/* ── Desktop sidebar ────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 fixed h-screen z-30 border-r border-sidebar-border">
        <div className="w-full">
          <AppSidebar
            isAdmin={isAdmin}
            userName={userName}
            userEmail={userEmail}
            onSignOut={onSignOut}
          />
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ─────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 lg:hidden transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <AppSidebar
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          onSignOut={onSignOut}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main content ───────────────────────────── */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">

        {/* Top header */}
        <header className="sticky top-0 z-30 glass border-b border-border/60 h-15">
          <div className="flex items-center justify-between w-full px-4 sm:px-6 h-15 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary/60 transition-all"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-base font-bold leading-none">{pageTitle}</h1>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  Welcome back, {userName || userEmail?.split('@')[0] || 'Student'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SubscriptionBadge userId={userId} />
              <ProductKeyRedemption userId={userId} />
              <ThemeToggle />
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-border">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-card">
                  {initials}
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold leading-none">{userName || "User"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 
