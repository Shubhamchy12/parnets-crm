import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FolderOpen, 
  CreditCard, 
  AlertTriangle, 
  HeadphonesIcon, 
  DollarSign,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch various statistics
        const [userStats, employeeStats, projects, clients, myActivities, monthlyStats] = await Promise.all([
          apiService.getUserStats().catch(() => ({ data: {} })),
          apiService.getEmployeeStats().catch(() => ({ data: {} })),
          apiService.getProjects({ limit: 100 }).catch(() => ({ data: { projects: [] } })),
          apiService.getClients({ limit: 100 }).catch(() => ({ data: { clients: [] } })),
          apiService.getMyActivities({ limit: 5 }).catch(() => ({ data: { activities: [] } })),
          apiService.getMonthlyStats().catch(() => ({ data: { monthlyData: [] } }))
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
            color: 'bg-blue-600', 
            change: '+12%'
          },
          { 
            title: 'Active Projects', 
            value: activeProjects.toString(), 
            icon: FolderOpen, 
            color: 'bg-green-600', 
            change: '+8%'
          },
          { 
            title: 'Total Projects', 
            value: totalProjects.toString(), 
            icon: CreditCard, 
            color: 'bg-orange-500', 
            change: `${completedProjects} completed`
          },
          { 
            title: 'Team Members', 
            value: totalEmployees.toString(), 
            icon: Users, 
            color: 'bg-purple-600', 
            change: `${employeeStats.data?.activeEmployees || 0} active`
          },
          { 
            title: 'Support Tickets', 
            value: '12', 
            icon: HeadphonesIcon, 
            color: 'bg-red-500', 
            change: '+2 new'
          },
          { 
            title: 'Revenue', 
            value: '₹8.5L', 
            icon: DollarSign, 
            color: 'bg-indigo-600', 
            change: '+15%'
          }
        ];

        setStats(dashboardStats);
        setActivities(myActivities.data?.activities || []);
        setMonthlyData(monthlyStats.data?.monthlyData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const recentActivities = activities.map((activity, index) => ({
    id: activity._id || index,
    action: activity.action || 'System maintenance completed',
    user: activity.user?.name || 'Admin',
    time: activity.createdAt ? new Date(activity.createdAt).toLocaleString() : new Date().toLocaleString(),
    type: activity.entity || 'system'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-blue-100">Welcome to your CRM dashboard</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Last updated</p>
            <p className="font-medium">{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="stats-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-green-600 font-medium">{stat.change}</p>
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
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Monthly Revenue</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <FolderOpen className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-bold text-gray-900">Monthly Projects</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="projects" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Recent Activities</h3>
            </div>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">by {activity.user}</p>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No recent activities</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;