import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, CheckSquare, MessageSquare, BookOpen, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendar', href: '/integration/calendar', icon: Calendar },
  { name: 'Tasks', href: '/integration/tasks', icon: CheckSquare },
  { name: 'Chat', href: '/integration/chat', icon: MessageSquare },
  { name: 'Journal', href: '/journal', icon: BookOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin', href: '/admin/accounts', icon: Shield, requiresAdmin: true },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0F172A' }}>
      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r" style={{ borderColor: '#1E293B' }}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b" style={{ borderColor: '#1E293B' }}>
          <h1 className="text-xl font-bold" style={{ color: '#6366F1' }}>SyncFlow</h1>
          <span className="ml-2 text-xs" style={{ color: '#22D3EE' }}>v1.0</span>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-3 border-b" style={{ borderColor: '#1E293B' }}>
            <p className="text-sm font-medium truncate" style={{ color: '#E5E7EB' }}>
              {user.name}
            </p>
            <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
              {user.email}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation
            .filter((item) => !item.requiresAdmin || user?.isAdmin)
            .map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive 
                    ? 'shadow-lg shadow-indigo-500/20' 
                    : 'hover:bg-opacity-50'
                }`}
                style={{
                  backgroundColor: isActive ? '#1E293B' : 'transparent',
                  color: isActive ? '#6366F1' : '#E5E7EB',
                  border: isActive ? '1px solid #6366F1' : '1px solid transparent',
                }}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t" style={{ borderColor: '#1E293B' }}>
          <Button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
            }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: '#1E293B' }}>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>
            <p>Dynamic Resiliency</p>
            <p className="mt-1">Local-First Privacy</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
