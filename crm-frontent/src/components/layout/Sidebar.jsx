import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  CreditCard, 
  ShoppingCart, 
  FileText, 
  Settings, 
  HeadphonesIcon,
  UserCheck,
  Activity,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../common/Logo';

const Sidebar = () => {
  const { user } = useAuth();

  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/dashboard',
      roles: ['super_admin', 'admin', 'sub_admin', 'accounts_manager', 'support_executive']
    },
    { 
      name: 'Clients', 
      icon: Users, 
      path: '/clients',
      roles: ['super_admin', 'admin', 'sub_admin']
    },
    { 
      name: 'Projects', 
      icon: FolderOpen, 
      path: '/projects',
      roles: ['super_admin', 'admin', 'sub_admin', 'developer']
    },
    { 
      name: 'Employees', 
      icon: UserCheck, 
      path: '/employees',
      roles: ['super_admin', 'admin']
    },
    { 
      name: 'Attendance', 
      icon: Calendar, 
      path: '/attendance',
      roles: ['super_admin', 'admin', 'sub_admin']
    },
    { 
      name: 'Payments', 
      icon: CreditCard, 
      path: '/payments',
      roles: ['super_admin', 'admin', 'accounts_manager']
    },
    { 
      name: 'Procurement', 
      icon: ShoppingCart, 
      path: '/procurement',
      roles: ['super_admin', 'admin']
    },
    { 
      name: 'Invoices', 
      icon: FileText, 
      path: '/invoices',
      roles: ['super_admin', 'admin', 'accounts_manager']
    },
    { 
      name: 'AMC', 
      icon: Settings, 
      path: '/amc',
      roles: ['super_admin', 'admin']
    },
    { 
      name: 'Support', 
      icon: HeadphonesIcon, 
      path: '/support',
      roles: ['super_admin', 'admin', 'support_executive']
    },
    { 
      name: 'Accounting', 
      icon: DollarSign, 
      path: '/accounting',
      roles: ['super_admin', 'admin', 'accounts_manager']
    },
    { 
      name: 'Activity Logs', 
      icon: Activity, 
      path: '/activity-logs',
      roles: ['super_admin']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="w-64 h-screen bg-slate-800 shadow-lg border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Logo size="small" showText={false} />
          <div>
            <h2 className="text-lg font-bold text-white">CRM System</h2>
            <p className="text-sm text-slate-300">{user?.name}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 flex-shrink-0">
        <div className="text-center">
          <p className="text-xs text-slate-400">© 2024 CRM System</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;