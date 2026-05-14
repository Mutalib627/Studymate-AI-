import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import MobileHeader from "./MobileHeader";
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
  const initials = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-subtle flex w-full">
      <aside className="hidden lg:flex w-64 flex-shrink-0 fixed h-screen">
        <AppSidebar isAdmin={isAdmin} userName={userName} userEmail={userEmail} onSignOut={onSignOut} />
      </aside>

      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        <MobileHeader pageTitle={pageTitle} userId={userId} userName={userName} userEmail={userEmail} isAdmin={isAdmin} onSignOut={onSignOut} />

        <header className="hidden lg:flex sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center justify-between w-full px-6 h-16">
            <div>
              <h1 className="text-lg font-bold">{pageTitle}</h1>
              <p className="text-xs text-muted-foreground">Welcome back, {userName || userEmail?.split('@')[0]}</p>
            </div>
            <div className="flex items-center gap-3">
              <SubscriptionBadge userId={userId} />
              <ProductKeyRedemption userId={userId} />
              <ThemeToggle />
              <div className="flex items-center gap-2.5 pl-3 border-l border-border">
                <div className="text-right">
                  <p className="text-sm font-semibold">{userName || "User"}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-card">
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
