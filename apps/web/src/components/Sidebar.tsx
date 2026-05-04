import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, User, Activity, CalendarDays, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/api/auth.api';

const NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/chat',    icon: MessageSquare,   label: 'Chat'        },
  { to: '/profile', icon: User,            label: 'Perfil'      },
  { to: '/records', icon: Activity,        label: 'Registros'   },
  { to: '/plans',   icon: CalendarDays,    label: 'Planes'      },
];

export function Sidebar() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    logout();
    navigate('/login');
  };

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 border border-accent/25">
          <span className="text-accent font-serif text-sm font-bold">N</span>
        </div>
        <span className="font-serif text-base text-ink tracking-wide">NutriAI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
                    className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150',
                isActive
                  ? 'bg-accent/15 text-accent-light font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-raised',
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-medium">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <p className="flex-1 truncate text-xs text-ink-muted">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="text-ink-faint hover:text-danger transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
