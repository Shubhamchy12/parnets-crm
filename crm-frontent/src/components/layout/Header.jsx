import { Bell, LogOut, User, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../common/Logo';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md border-b-2 border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left - Logo and Title */}
        <div className="flex items-center space-x-4">
          <Logo size="small" showText={false} />
          <div>
            <h1 className="text-xl font-bold text-slate-800">CRM System</h1>
            <p className="text-sm text-slate-600">Welcome back, {user?.name}</p>
          </div>
        </div>

        {/* Right - Search and User */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 bg-white text-slate-800"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-300">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              3
            </span>
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3 bg-slate-50 rounded-lg p-2 border border-slate-300">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-800">{user?.name}</p>
              <p className="text-blue-600 capitalize font-medium">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-300"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;