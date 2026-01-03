import React from 'react';
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
      name: 'Support Tickets', 
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
    <div className="bg-gray-900 text-white w-64 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <Logo size="medium" showText={true} className="mb-3" />
        <div className="ml-1">
          <p className="text-gray-300 text-sm font-medium">{user?.name}</p>
          <p className="text-gray-500 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 text-sm ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;