import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-subtle flex w-full">

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0 fixed h-screen z-30 border-r border-sidebar-border">
        <AppSidebar
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          onSignOut={onSignOut}
          activeTab={activeTab}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transition-transform duration-300 ease-in-out border-r border-sidebar-border ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
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

      {/* Main */}
      <div className="flex-1 lg:ml-60 min-h-screen flex flex-col min-w-0">

        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-border/60">
          <div className="flex items-center justify-between w-full px-4 sm:px-5 h-14">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/60 transition-all flex-shrink-0"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-none truncate">{pageTitle}</h1>
                <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
                  {userName || userEmail?.split('@')[0] || 'Student'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <SubscriptionBadge userId={userId} />
              <ProductKeyRedemption userId={userId} />
              <ThemeToggle />
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-card ml-1">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-3 sm:p-5 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 
