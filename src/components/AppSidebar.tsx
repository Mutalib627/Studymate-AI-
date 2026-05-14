import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, BrainCircuit, MessagesSquare, Settings, ClockArrowUp, Shield, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface AppSidebarProps {
  isAdmin: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
  userName?: string;
  userEmail?: string;
}

const menuItems = [
  { title: "Study", path: "/", icon: BookOpen, tab: "study" },
  { title: "Quiz", path: "/", icon: BrainCircuit, tab: "quiz" },
  { title: "Chat", path: "/chat", icon: MessagesSquare },
  { title: "History", path: "/history", icon: ClockArrowUp },
  { title: "Settings", path: "/settings", icon: Settings },
];

const AppSidebar = ({ isAdmin, onSignOut, onNavigate, userName, userEmail }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const go = (path: string, tab?: string) => {
    if (tab) navigate(path, { state: { activeTab: tab } });
    else navigate(path);
    onNavigate?.();
  };

  const isActive = (path: string) => location.pathname === path;
  const initials = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* User header */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={logo} alt="" className="w-11 h-11 rounded-full shadow-card object-cover bg-transparent mix-blend-multiply dark:mix-blend-normal" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-sidebar" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-sidebar-foreground truncate">{userName || "Welcome"}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            onClick={() => go(item.path, item.tab)}
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 rounded-xl font-medium text-sm transition-all",
              isActive(item.path)
                ? "bg-gradient-primary text-primary-foreground shadow-card hover:opacity-95 hover:bg-gradient-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.title}
          </Button>
        ))}
        {isAdmin && (
          <Button
            variant="ghost"
            onClick={() => { navigate("/admin"); onNavigate?.(); }}
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 rounded-xl font-medium text-sm transition-all",
              location.pathname === "/admin"
                ? "bg-gradient-primary text-primary-foreground shadow-card hover:bg-gradient-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Shield className="w-4 h-4" /> Admin
          </Button>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-3">
        <Button
          variant="ghost"
          onClick={onSignOut}
          className="w-full justify-start gap-3 h-11 px-3 rounded-xl font-medium text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Power className="w-4 h-4" /> Logout
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">© Cybertech.IT · Studymate AI</p>
      </div>
    </div>
  );
};

export default AppSidebar;
