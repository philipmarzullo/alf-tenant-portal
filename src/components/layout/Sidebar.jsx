import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, ShoppingCart,
  FileBarChart, Presentation, Bot, Settings,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { NAV_ITEMS } from '../../data/constants';

const ICON_MAP = {
  LayoutDashboard, Users, DollarSign, ShoppingCart,
  FileBarChart, Presentation, Bot, Settings,
};

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-dark-nav flex flex-col transition-all duration-200 z-50 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-white/10 shrink-0">
        <img
          src="/logo-white.png"
          alt="A&A"
          className={`transition-all duration-200 ${collapsed ? 'h-6' : 'h-7'}`}
        />
        {!collapsed && (
          <span className="text-white/70 text-xs leading-tight mt-1">
            Operations<br />Portal
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
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
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm transition-colors relative ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-aa-blue rounded-r" />
                  )}
                  {Icon && <Icon size={18} />}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-white/10 px-4 py-3 shrink-0">
        {collapsed ? (
          <div className="w-8 h-8 rounded-full bg-aa-blue/20 flex items-center justify-center text-aa-blue text-xs font-bold">
            PM
          </div>
        ) : (
          <div>
            <div className="text-white text-sm font-medium">Philip Marzullo</div>
            <div className="text-white/40 text-xs">Partnerships & Innovation</div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="border-t border-white/10 px-4 py-3 text-white/30 hover:text-white/60 transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
