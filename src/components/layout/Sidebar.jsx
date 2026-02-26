import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, ShoppingCart, HardHat,
  FileBarChart, Presentation, Bot, Settings, UserCog, Briefcase,
  Building2, BarChart3, FileText, Palette,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { NAV_ITEMS } from '../../data/constants';
import { useUser } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';

const ICON_MAP = {
  LayoutDashboard, Users, DollarSign, ShoppingCart, HardHat,
  FileBarChart, Presentation, Bot, Settings, UserCog, Briefcase,
  Building2, BarChart3, FileText, Palette,
};

export default function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { currentUser, isSuperAdmin, isAdmin, isPlatformOwner } = useUser();
  const { signOut } = useAuth();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Filter nav items by current user's permissions
  const filteredNav = NAV_ITEMS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.moduleKey) return true;
        if (item.moduleKey === 'platform') return isPlatformOwner;
        if (item.moduleKey === 'superAdmin') return isSuperAdmin;
        if (item.moduleKey === 'admin') return isAdmin;
        if (isAdmin) return true;
        return currentUser?.modules?.includes(item.moduleKey);
      }),
    }))
    .filter((group) => group.items.length > 0);

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?';

  // On mobile: always show full-width sidebar (not collapsed)
  const showCollapsed = !isMobile && collapsed;

  const sidebar = (
    <aside
      className={`fixed top-0 left-0 h-screen bg-dark-nav flex flex-col transition-all duration-200 z-50 ${
        isMobile
          ? `w-60 transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
          : showCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-white/10 shrink-0">
        {isPlatformOwner ? (
          <>
            <img
              src="/alf-logo.jpg"
              alt="Alf"
              className={`rounded-full transition-all duration-200 ${showCollapsed ? 'h-8 w-8' : 'h-9 w-9'}`}
            />
            {!showCollapsed && (
              <span className="text-amber-400 font-bold text-lg leading-tight">Alf</span>
            )}
          </>
        ) : (
          <>
            <img
              src="/logo-white.png"
              alt="A&A"
              className={`transition-all duration-200 ${showCollapsed ? 'h-6' : 'h-7'}`}
            />
            {!showCollapsed && (
              <span className="text-white/70 text-xs leading-tight mt-1">
                Operations<br />Portal
              </span>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredNav.map((group) => (
          <div key={group.group} className="mb-4">
            {!showCollapsed && (
              <div className="px-4 mb-2 text-[11px] font-semibold tracking-wider text-white/30 uppercase">
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const active = isActive(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && onMobileClose?.()}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm transition-colors relative ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  {active && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r ${
                      isPlatformOwner ? 'bg-amber-500' : 'bg-aa-blue'
                    }`} />
                  )}
                  {Icon && <Icon size={18} />}
                  {!showCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 shrink-0">
        <div className="w-full px-4 py-3 flex items-center gap-3">
          {showCollapsed ? (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              isPlatformOwner ? 'bg-amber-500/20 text-amber-400' : 'bg-aa-blue/20 text-aa-blue'
            }`}>
              {initials}
            </div>
          ) : (
            <>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isPlatformOwner ? 'bg-amber-500/20 text-amber-400' : 'bg-aa-blue/20 text-aa-blue'
              }`}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{currentUser?.name}</div>
                <div className="text-white/40 text-xs truncate">{currentUser?.title}</div>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle — hidden on mobile */}
      {!isMobile && (
        <button
          onClick={onToggle}
          className="border-t border-white/10 px-4 py-3 text-white/30 hover:text-white/60 transition-colors flex items-center justify-center"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
    </aside>
  );

  return (
    <>
      {/* Backdrop — mobile only */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onMobileClose}
        />
      )}
      {sidebar}
    </>
  );
}
