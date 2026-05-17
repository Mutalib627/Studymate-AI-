import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, BrainCircuit, MessagesSquare, Settings,
  ClockArrowUp, Shield, Power, GraduationCap
} from "lucide-react";
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
  { title: "Study", path: "/", icon: BookOpen, tab: "study", desc: "Upload & summarize" },
  { title: "Quiz", path: "/", icon: BrainCircuit, tab: "quiz", desc: "Test your knowledge" },
  { title: "Chat", path: "/chat", icon: MessagesSquare, desc: "AI assistant" },
  { title: "History", path: "/history", icon: ClockArrowUp, desc: "Past sessions" },
  { title: "Settings", path: "/settings", icon: Settings, desc: "Account & preferences" },
];

const AppSidebar = ({ isAdmin, onSignOut, onNavigate, userName, userEmail }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const go = (path: string, tab?: string) => {
    if (tab) navigate(path, { state: { activeTab: tab } });
    else navigate(path);
    onNavigate?.();
  };

  const isActive = (item: typeof menuItems[0]) =>
    item.tab
      ? location.pathname === item.path
      : location.pathname === item.path;

  const initials = (userName || userEmail || "U").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--sidebar-background))" }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card flex-shrink-0">
            <img src={logo} alt="" className="w-7 h-7 rounded-lg object-cover" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "hsl(var(--sidebar-foreground))" }}>Studymate AI</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--sidebar-muted))" }}>Smart Learning Platform</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 mb-4 h-px" style={{ background: "hsl(var(--sidebar-border))" }} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase" style={{ color: "hsl(var(--sidebar-muted))" }}>
          Menu
        </p>
        {menuItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.title}
              onClick={() => go(item.path, item.tab)}
              className={cn(
                "nav-item w-full",
                active && "active"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                active ? "bg-white/20" : "bg-sidebar-accent"
              )}>
                <item.icon className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold leading-none">{item.title}</p>
                <p className="text-[10px] mt-0.5 truncate opacity-60">{item.desc}</p>
              </div>
            </button>
          );
        })}

        {isAdmin && (
          <>
            <div className="mx-2 my-3 h-px" style={{ background: "hsl(var(--sidebar-border))" }} />
            <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase" style={{ color: "hsl(var(--sidebar-muted))" }}>
              Admin
            </p>
            <button
              onClick={() => { navigate("/admin"); onNavigate?.(); }}
              className={cn("nav-item w-full", location.pathname === "/admin" && "active")}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                location.pathname === "/admin" ? "bg-white/20" : "bg-sidebar-accent"
              )}>
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold leading-none">Admin</p>
                <p className="text-[10px] mt-0.5 opacity-60">Manage platform</p>
              </div>
            </button>
          </>
        )}
      </nav>

      {/* Divider */}
      <div className="mx-5 mt-2 mb-3 h-px" style={{ background: "hsl(var(--sidebar-border))" }} />

      {/* User profile */}
      <div className="px-3 pb-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--sidebar-accent))" }}>
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              {userName || "User"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "hsl(var(--sidebar-muted))" }}>
              {userEmail}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        </div>

        <button
          onClick={onSignOut}
          className="nav-item w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-400"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <Power className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">Sign out</span>
        </button>

        <p className="text-center text-[10px] pb-1" style={{ color: "hsl(var(--sidebar-muted))" }}>
          © Cybertech.IT · Studymate AI
        </p>
      </div>
    </div>
  );
};

export default AppSidebar; 
