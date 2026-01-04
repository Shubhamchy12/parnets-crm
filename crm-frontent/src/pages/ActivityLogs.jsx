import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  Eye, 
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const ActivityLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [dateRange, setDateRange] = useState('today');

  // Mock activity logs data
  const activityLogs = [
    {
      id: 1,
      user: 'John Doe',
      userRole: 'sub_admin',
      action: 'project_created',
      description: 'Created new project "E-commerce Platform"',
      timestamp: '2024-01-03T10:30:00Z',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      details: {
        projectId: 1,
        projectName: 'E-commerce Platform',
        clientName: 'ABC Corp'
      },
      severity: 'info'
    },
    {
      id: 2,
      user: 'Sarah Wilson',
      userRole: 'admin',
      action: 'employee_updated',
      description: 'Updated employee salary for Mike Johnson',
      timestamp: '2024-01-03T09:15:00Z',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      details: {
        employeeId: 3,
        employeeName: 'Mike Johnson',
        oldSalary: 60000,
        newSalary: 65000
      },
      severity: 'warning'
    },
    {
      id: 3,
      user: 'Mike Johnson',
      userRole: 'sub_admin',
      action: 'project_milestone_completed',
      description: 'Marked milestone "Database Design" as completed',
      timestamp: '2024-01-03T08:45:00Z',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      details: {
        projectId: 1,
        milestoneName: 'Database Design',
        completedDate: '2024-01-03'
      },
      severity: 'success'
    },
    {
      id: 4,
      user: 'Admin System',
      userRole: 'system',
      action: 'payment_received',
      description: 'Payment received from ABC Corp for project milestone',
      timestamp: '2024-01-02T16:20:00Z',
      ipAddress: 'system',
      userAgent: 'System Process',
      details: {
        amount: 125000,
        clientName: 'ABC Corp',
        projectId: 1,
        paymentMethod: 'Bank Transfer'
      },
      severity: 'success'
    },
    {
      id: 5,
      user: 'Jane Smith',
      userRole: 'sub_admin',
      action: 'login_failed',
      description: 'Failed login attempt - incorrect OTP',
      timestamp: '2024-01-02T14:30:00Z',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      details: {
        reason: 'Invalid OTP',
        attempts: 3
      },
      severity: 'error'
    },
    {
      id: 6,
      user: 'John Doe',
      userRole: 'sub_admin',
      action: 'client_created',
      description: 'Added new client "XYZ Ltd"',
      timestamp: '2024-01-02T11:15:00Z',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      details: {
        clientName: 'XYZ Ltd',
        contactPerson: 'Robert Smith',
        email: 'robert@xyzltd.com'
      },
      severity: 'info'
    }
  ];

  const users = ['all', ...new Set(activityLogs.map(log => log.user))];
  const actions = ['all', ...new Set(activityLogs.map(log => log.action))];

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUser = filterUser === 'all' || log.user === filterUser;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    
    // Date filtering logic would go here
    return matchesSearch && matchesUser && matchesAction;
  });

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'success':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const exportLogs = () => {
    // Export functionality would go here
    console.log('Exporting logs...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Activity Logs</h1>
            <p className="text-blue-100">Monitor system activities</p>
          </div>
          <button 
            onClick={exportLogs}
            className="btn-primary bg-white/20 hover:bg-white/30 border border-white/30"
          >
            <Download className="h-5 w-5" />
            Export Logs
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="input-field pl-10 appearance-none"
            >
              {users.map(user => (
                <option key={user} value={user}>
                  {user === 'all' ? 'All Users' : user}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Activity className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="input-field pl-10 appearance-none"
            >
              {actions.map(action => (
                <option key={action} value={action}>
                  {action === 'all' ? 'All Actions' : action.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-field pl-10 appearance-none"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="space-y-4">
        {filteredLogs.map((log) => {
          const timestamp = formatTimestamp(log.timestamp);
          return (
            <div 
              key={log.id} 
              className={`card border-l-4 ${getSeverityColor(log.severity)} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex items-center space-x-2">
                    {getSeverityIcon(log.severity)}
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {log.user.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{log.user}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {log.userRole.replace('_', ' ')}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        {log.action.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-2">{log.description}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{timestamp.date} at {timestamp.time}</span>
                      </div>
                      <span>IP: {log.ipAddress}</span>
                    </div>

                    {/* Additional Details */}
                    {log.details && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Details:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="ml-1 font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button className="text-gray-400 hover:text-gray-600 p-1">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;