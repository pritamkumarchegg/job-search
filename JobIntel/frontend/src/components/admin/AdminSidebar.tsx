import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  BarChart3,
  Globe,
  CreditCard,
  Handshake,
  FileText,
  Award,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Briefcase, label: 'Jobs', path: '/admin/jobs' },
  { icon: Briefcase, label: 'All Jobs', path: '/all-jobs' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: FileText, label: 'Profile Fields', path: '/admin/profile-fields' },
  { icon: Award, label: 'Skills', path: '/admin/skills' },
  { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
  { icon: Handshake, label: 'Referrals', path: '/admin/referrals' },
  { icon: Globe, label: 'Crawlers', path: '/admin/crawlers' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: CreditCard, label: 'Revenue', path: '/admin/revenue' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function AdminSidebar({ collapsed = false, onToggleCollapse, onOpenChange }: AdminSidebarProps) {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleNavClick = () => {
    // Close mobile menu after navigation
    if (isMobileOpen) {
      setIsMobileOpen(false);
      onOpenChange?.(false);
    }
  };

  return (
    <>
      {/* Mobile Header - Visible only on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <span className="text-white font-bold text-sm">JI</span>
          </div>
          <span className="font-bold text-foreground">Admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsMobileOpen(!isMobileOpen);
            onOpenChange?.(!isMobileOpen);
          }}
          className="h-8 w-8"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => {
            setIsMobileOpen(false);
            onOpenChange?.(false);
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static h-screen bg-card border-r border-border transition-all duration-300 flex flex-col z-40',
          // Mobile: fixed positioned, full height sidebar
          isMobileOpen ? 'left-0 top-16 w-64 md:top-0' : '-left-64 md:left-0 md:top-0',
          // Desktop: collapse behavior
          collapsed ? 'md:w-16' : 'md:w-64',
          'w-64 md:w-auto'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header - Desktop only */}
          <div className="hidden md:flex h-16 items-center justify-between border-b border-border px-4">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JI</span>
                </div>
                <span className="font-bold text-foreground">Admin</span>
              </div>
            )}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8"
              >
                {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                             (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {/* Desktop: Show label if not collapsed */}
                  <span className="hidden md:inline flex-1">{!collapsed && item.label}</span>
                  {/* Mobile: Always show label */}
                  <span className="md:hidden flex-1">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-2">
            <NavLink
              to="/"
              onClick={handleNavClick}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {/* Desktop: Show label if not collapsed */}
              <span className="hidden md:inline flex-1">{!collapsed && 'Exit Admin'}</span>
              {/* Mobile: Always show label */}
              <span className="md:hidden flex-1">Exit Admin</span>
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
}
