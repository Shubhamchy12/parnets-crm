import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FolderOpen, 
  CreditCard, 
  AlertTriangle, 
  HeadphonesIcon, 
  DollarSign,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch various statistics
        const [userStats, employeeStats, projects, clients, myActivities] = await Promise.all([
          apiService.getUserStats().catch(() => ({ data: {} })),
          apiService.getEmployeeStats().catch(() => ({ data: {} })),
          apiService.getProjects({ limit: 100 }).catch(() => ({ data: { projects: [] } })),
          apiService.getClients({ limit: 100 }).catch(() => ({ data: { clients: [] } })),
          apiService.getMyActivities({ limit: 5 }).catch(() => ({ data: { activities: [] } }))
        ]);

        // Calculate stats
        const totalClients = clients.data?.clients?.length || 0;
        const totalProjects = projects.data?.projects?.length || 0;
        const activeProjects = projects.data?.projects?.filter(p => p.status === 'in_progress')?.length || 0;
        const completedProjects = projects.data?.projects?.filter(p => p.status === 'completed')?.length || 0;
        const totalEmployees = employeeStats.data?.totalEmployees || 0;

        const dashboardStats = [
          { 
            title: 'Total Clients', 
            value: totalClients.toString(), 
            icon: Users, 
            color: 'bg-blue-500', 
            change: '+12%' 
          },
          { 
            title: 'Active Projects', 
            value: activeProjects.toString(), 
            icon: FolderOpen, 
            color: 'bg-green-500', 
            change: '+8%' 
          },
          { 
            title: 'Total Projects', 
            value: totalProjects.toString(), 
            icon: FolderOpen, 
            color: 'bg-purple-500', 
            change: `${completedProjects} completed` 
          },
          { 
            title: 'Total Employees', 
            value: totalEmployees.toString(), 
            icon: Users, 
            color: 'bg-indigo-500', 
            change: `${employeeStats.data?.activeEmployees || 0} active` 
          },
          { 
            title: 'Pending Tasks', 
            value: '23', 
            icon: AlertTriangle, 
            color: 'bg-yellow-500', 
            change: '-3' 
          },
          { 
            title: 'Support Tickets', 
            value: '12', 
            icon: HeadphonesIcon, 
            color: 'bg-red-500', 
            change: '+2' 
          }
        ];

        setStats(dashboardStats);
        setActivities(myActivities.data?.activities || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const monthlyData = [
    { month: 'Jan', revenue: 650000, projects: 35 },
    { month: 'Feb', revenue: 720000, projects: 38 },
    { month: 'Mar', revenue: 680000, projects: 42 },
    { month: 'Apr', revenue: 790000, projects: 45 },
    { month: 'May', revenue: 850000, projects: 43 },
    { month: 'Jun', revenue: 875000, projects: 43 }
  ];

  const recentActivities = activities.map((activity, index) => ({
    id: activity._id || index,
    action: activity.action || 'Unknown action',
    user: activity.user?.name || 'System',
    time: activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown time',
    type: activity.entity || 'system'
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                        {stat.change}
                      </p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Monthly Revenue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Project Count</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="projects" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'project' ? 'bg-blue-500' :
                      activity.type === 'payment' ? 'bg-green-500' :
                      activity.type === 'support' ? 'bg-purple-500' :
                      activity.type === 'attendance' ? 'bg-yellow-500' :
                      activity.type === 'client' ? 'bg-indigo-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-600">by {activity.user}</p>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activities</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;