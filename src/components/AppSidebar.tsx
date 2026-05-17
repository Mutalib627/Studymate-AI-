import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, BrainCircuit, MessagesSquare, Settings,
  ClockArrowUp, Shield, Power
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface AppSidebarProps {
  isAdmin: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
  userName?: string;
  userEmail?: string;
  activeTab?: string;
}

const AppSidebar = ({ isAdmin, onSignOut, onNavigate, userName, userEmail, activeTab }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const go = (path: string, tab?: string) => {
    if (tab) navigate(path, { state: { activeTab: tab } });
    else navigate(path);
    onNavigate?.();
  };

  const isActive = (item: any) => {
    if (item.path !== "/") return location.pathname === item.path;
    if (item.tab) return location.pathname === "/" && activeTab === item.tab;
    return false;
  };

  const initials = (userName || userEmail || "U").slice(0, 2).toUpperCase();

  const menuItems = [
    { title: "Study", path: "/", icon: BookOpen, tab: "study", desc: "Upload & summarize" },
    { title: "Quiz", path: "/", icon: BrainCircuit, tab: "quiz", desc: "Test your knowledge" },
    { title: "Chat", path: "/chat", icon: MessagesSquare, desc: "AI assistant" },
    { title: "History", path: "/history", icon: ClockArrowUp, desc: "Past sessions" },
    { title: "Settings", path: "/settings", icon: Settings, desc: "Preferences" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "hsl(var(--sidebar-background))" }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card flex-shrink-0">
            <img src={logo} alt="" className="w-7 h-7 rounded-lg object-cover" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-none" style={{ color: "hsl(var(--sidebar-foreground))" }}>Studymate AI</p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "hsl(var(--sidebar-muted))" }}>Smart Learning Platform</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 h-px flex-shrink-0" style={{ background: "hsl(var(--sidebar-border))" }} />

      {/* Nav */}
      <nav className="flex-1 px-2 overflow-y-auto space-y-0.5 pb-2">
        <p className="px-3 pb-2 pt-1 text-[10px] font-semibold tracking-wider uppercase flex-shrink-0" style={{ color: "hsl(var(--sidebar-muted))" }}>
          Menu
        </p>
        {menuItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={`${item.title}-${item.tab || ''}`}
              onClick={() => go(item.path, item.tab)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                active
                  ? "text-white shadow-card"
                  : "hover:bg-sidebar-accent"
              )}
              style={active ? { background: "var(--gradient-primary)" } : { color: "hsl(var(--sidebar-muted))" }}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                active ? "bg-white/20" : "bg-sidebar-accent"
              )}>
                <item.icon className="w-4 h-4" style={active ? {} : { color: "hsl(var(--sidebar-foreground))" }} />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold leading-none" style={active ? {} : { color: "hsl(var(--sidebar-foreground))" }}>{item.title}</p>
                <p className="text-[10px] mt-0.5 truncate opacity-60" style={active ? {} : { color: "hsl(var(--sidebar-muted))" }}>{item.desc}</p>
              </div>
            </button>
          );
        })}

        {isAdmin && (
          <>
            <div className="mx-2 my-2 h-px" style={{ background: "hsl(var(--sidebar-border))" }} />
            <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase" style={{ color: "hsl(var(--sidebar-muted))" }}>Admin</p>
            <button
              onClick={() => { navigate("/admin"); onNavigate?.(); }}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                location.pathname === "/admin" ? "text-white shadow-card" : "hover:bg-sidebar-accent"
              )}
              style={location.pathname === "/admin" ? { background: "var(--gradient-primary)" } : { color: "hsl(var(--sidebar-muted))" }}
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", location.pathname === "/admin" ? "bg-white/20" : "bg-sidebar-accent")}>
                <Shield className="w-4 h-4" style={{ color: location.pathname === "/admin" ? "white" : "hsl(var(--sidebar-foreground))" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={location.pathname === "/admin" ? {} : { color: "hsl(var(--sidebar-foreground))" }}>Admin</p>
                <p className="text-[10px] opacity-60" style={{ color: "hsl(var(--sidebar-muted))" }}>Manage platform</p>
              </div>
            </button>
          </>
        )}
      </nav>

      <div className="mx-4 mb-2 h-px flex-shrink-0" style={{ background: "hsl(var(--sidebar-border))" }} />

      {/* User + logout */}
      <div className="px-2 pb-4 flex-shrink-0 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--sidebar-accent))" }}>
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-none" style={{ color: "hsl(var(--sidebar-foreground))" }}>{userName || "User"}</p>
            <p className="text-[10px] truncate mt-0.5" style={{ color: "hsl(var(--sidebar-muted))" }}>{userEmail}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        </div>

        <button
          onClick={onSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-rose-400 hover:bg-rose-500/10"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <Power className="w-4 h-4 text-rose-400" />
          </div>
          Sign out
        </button>

        <p className="text-center text-[10px] py-1" style={{ color: "hsl(var(--sidebar-muted))" }}>
          © Cybertech.IT · Studymate AI
        </p>
      </div>
    </div>
  );
};

export default AppSidebar;
