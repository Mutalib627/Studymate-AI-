import { ReactNode, useState } from "react";
import { Menu, X } from "lucide-react";
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
  activeTab?: string;
}

const DashboardLayout = ({
  children, pageTitle, userId, userName, userEmail, isAdmin, onSignOut, activeTab,
}: DashboardLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = (userName || userEmail || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-subtle flex w-full overflow-x-hidden">

      {/* ── Desktop Sidebar ─────────── */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 fixed top-0 left-0 h-screen z-30 border-r border-sidebar-border">
        <AppSidebar
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          onSignOut={onSignOut}
          activeTab={activeTab}
        />
      </aside>

      {/* ── Mobile Sidebar ──────────── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Drawer */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-50 lg:hidden
          transition-transform duration-300 ease-in-out
          border-r border-sidebar-border
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <AppSidebar
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          onSignOut={onSignOut}
          onNavigate={() => setMobileOpen(false)}
          activeTab={activeTab}
        />
      </aside>

      {/* ── Main Content ────────────── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen min-w-0 w-full">

        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-3 sm:px-5 h-14">

            {/* Left */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Hamburger — only on mobile */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-secondary/60 text-foreground hover:bg-secondary transition-all flex-shrink-0"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight truncate">{pageTitle}</h1>
                <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                  {userName || userEmail?.split('@')[0]}
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <SubscriptionBadge userId={userId} />
              <ProductKeyRedemption userId={userId} />
              <ThemeToggle />
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-card ml-1 flex-shrink-0">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-5 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
