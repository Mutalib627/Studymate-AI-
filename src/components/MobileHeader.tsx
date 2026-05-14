import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import AppSidebar from "./AppSidebar";
import SubscriptionBadge from "./SubscriptionBadge";
import { useState } from "react";
import logo from "@/assets/logo.png";

interface MobileHeaderProps {
  pageTitle: string;
  userId: string;
  userName: string;
  userEmail?: string;
  isAdmin: boolean;
  onSignOut: () => void;
}

const MobileHeader = ({ pageTitle, userId, userName, userEmail, isAdmin, onSignOut }: MobileHeaderProps) => {
  const [open, setOpen] = useState(false);
  const initials = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 glass border-b border-border lg:hidden">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <AppSidebar isAdmin={isAdmin} userName={userName} userEmail={userEmail} onSignOut={onSignOut} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <img src={logo} alt="" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-sm">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-card">
            {initials}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <SubscriptionBadge userId={userId} />
      </div>
    </header>
  );
};

export default MobileHeader;
