import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  Download,
  Bell,
  LogIn,
  LogOut
} from 'lucide-react';
import api from '../services/api';

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load today's attendance on component mount
  useEffect(() => {
    loadTodayAttendance();
  }, []);

  const loadTodayAttendance = async () => {
    try {
      const response = await api.getTodayAttendance();
      if (response.success) {
        setTodayAttendance(response.data.attendance);
      }
    } catch (err) {
      console.error('Error loading today attendance:', err);
    }
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      const response = await api.checkIn();
      if (response.success) {
        setTodayAttendance(response.data.attendance);
        setError(null);
      }
    } catch (err) {
      setError('Failed to check in');
      console.error('Check-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      const response = await api.checkOut();
      if (response.success) {
        setTodayAttendance(response.data.attendance);
        setError(null);
      }
    } catch (err) {
      setError('Failed to check out');
      console.error('Check-out error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mock attendance data
  const attendanceData = [
    {
      id: 1,
      employeeId: 1,
      employeeName: 'John Doe',
      department: 'Development',
      date: '2024-01-03',
      checkIn: '09:15:00',
      checkOut: '18:30:00',
      status: 'present',
      workingHours: 8.25,
      isLate: true,
      lateBy: 15, // minutes
      overtime: 0.5,
      location: 'Office',
      notes: 'Traffic delay'
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Sarah Wilson',
      department: 'Management',
      date: '2024-01-03',
      checkIn: '08:45:00',
      checkOut: '17:15:00',
      status: 'present',
      workingHours: 8.5,
      isLate: false,
      lateBy: 0,
      overtime: 0.5,
      location: 'Office',
      notes: ''
    },
    {
      id: 3,
      employeeId: 3,
      employeeName: 'Mike Johnson',
      department: 'Design',
      date: '2024-01-03',
      checkIn: null,
      checkOut: null,
      status: 'absent',
      workingHours: 0,
      isLate: false,
      lateBy: 0,
      overtime: 0,
      location: null,
      notes: 'Sick leave'
    },
    {
      id: 4,
      employeeId: 4,
      employeeName: 'Emily Davis',
      department: 'Development',
      date: '2024-01-03',
      checkIn: '10:30:00',
      checkOut: '19:00:00',
      status: 'present',
      workingHours: 7.5,
      isLate: true,
      lateBy: 90, // minutes
      overtime: 1,
      location: 'Remote',
      notes: 'Working from home'
    }
  ];

  // Mock monthly summary
  const monthlySummary = {
    totalEmployees: 25,
    presentToday: 22,
    absentToday: 2,
    lateToday: 5,
    averageAttendance: 94.2,
    totalWorkingDays: 22,
    notifications: [
      { type: 'late', count: 5, message: '5 employees are late today' },
      { type: 'absent', count: 2, message: '2 employees are absent today' },
      { type: 'overtime', count: 8, message: '8 employees working overtime' }
    ]
  };

  const filteredAttendance = attendanceData.filter(record => {
    const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status, isLate) => {
    if (status === 'absent') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else if (isLate) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusColor = (status, isLate) => {
    if (status === 'absent') {
      return 'bg-red-50 border-red-200';
    } else if (isLate) {
      return 'bg-yellow-50 border-yellow-200';
    } else {
      return 'bg-green-50 border-green-200';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--';
    return new Date(`2024-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const sendNotification = (type) => {
    // Notification logic would go here
    console.log(`Sending ${type} notification`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Attendance Management</h1>
            <p className="text-blue-100">Track employee attendance</p>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-gray-900 border-0"
            />
            <button className="btn-primary bg-white/20 hover:bg-white/30 border border-white/30">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Check-in/Check-out Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Today's Attendance
          </h3>
          <div className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Check-in Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Check-in Time</span>
              {todayAttendance?.checkIn?.time && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-lg font-semibold">
              {todayAttendance?.checkIn?.time 
                ? new Date(todayAttendance.checkIn.time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : '--:--'
              }
            </p>
          </div>

          {/* Check-out Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Check-out Time</span>
              {todayAttendance?.checkOut?.time && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-lg font-semibold">
              {todayAttendance?.checkOut?.time 
                ? new Date(todayAttendance.checkOut.time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : '--:--'
              }
            </p>
          </div>

          {/* Working Hours */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Working Hours</span>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-lg font-semibold">
              {todayAttendance?.totalHours 
                ? `${todayAttendance.totalHours.toFixed(1)}h`
                : '0.0h'
              }
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-6">
          <button
            onClick={handleCheckIn}
            disabled={loading || (todayAttendance?.checkIn?.time && !todayAttendance?.checkOut?.time)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              todayAttendance?.checkIn?.time && !todayAttendance?.checkOut?.time
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <LogIn className="h-5 w-5" />
            <span>{loading ? 'Processing...' : 'Check In'}</span>
          </button>

          <button
            onClick={handleCheckOut}
            disabled={loading || !todayAttendance?.checkIn?.time || todayAttendance?.checkOut?.time}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              !todayAttendance?.checkIn?.time || todayAttendance?.checkOut?.time
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <LogOut className="h-5 w-5" />
            <span>{loading ? 'Processing...' : 'Check Out'}</span>
          </button>
        </div>

        {/* Status Message */}
        <div className="mt-4 text-center">
          {!todayAttendance?.checkIn?.time && (
            <p className="text-sm text-gray-600">Click "Check In" to start your workday</p>
          )}
          {todayAttendance?.checkIn?.time && !todayAttendance?.checkOut?.time && (
            <p className="text-sm text-green-600">You are currently checked in</p>
          )}
          {todayAttendance?.checkIn?.time && todayAttendance?.checkOut?.time && (
            <p className="text-sm text-blue-600">You have completed your workday</p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-2xl font-bold text-green-600">{monthlySummary.presentToday}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent Today</p>
              <p className="text-2xl font-bold text-red-600">{monthlySummary.absentToday}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Late Today</p>
              <p className="text-2xl font-bold text-yellow-600">{monthlySummary.lateToday}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-blue-600">{monthlySummary.averageAttendance}%</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Attendance Notifications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {monthlySummary.notifications.map((notification, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                <p className="text-xs text-gray-600">Click to send notification</p>
              </div>
              <button
                onClick={() => sendNotification(notification.type)}
                className="btn-secondary text-xs py-1 px-3"
              >
                Notify
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field pl-10 appearance-none"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">
          Daily Attendance - {new Date(selectedDate).toLocaleDateString()}
        </h3>
        
        <div className="space-y-4">
          {filteredAttendance.map((record) => (
            <div 
              key={record.id} 
              className={`p-4 rounded-lg border ${getStatusColor(record.status, record.isLate)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(record.status, record.isLate)}
                  <div>
                    <h4 className="font-medium text-gray-900">{record.employeeName}</h4>
                    <p className="text-sm text-gray-600">{record.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Check In</p>
                    <p className="font-medium">{formatTime(record.checkIn)}</p>
                    {record.isLate && (
                      <p className="text-xs text-red-600">Late by {record.lateBy}m</p>
                    )}
                  </div>

                  <div>
                    <p className="text-gray-600">Check Out</p>
                    <p className="font-medium">{formatTime(record.checkOut)}</p>
                  </div>

                  <div>
                    <p className="text-gray-600">Working Hours</p>
                    <p className="font-medium">{record.workingHours}h</p>
                    {record.overtime > 0 && (
                      <p className="text-xs text-blue-600">+{record.overtime}h OT</p>
                    )}
                  </div>

                  <div>
                    <p className="text-gray-600">Location</p>
                    <p className="font-medium">{record.location || '--'}</p>
                  </div>

                  <div>
                    <p className="text-gray-600">Status</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'present' 
                        ? record.isLate 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.status === 'present' && record.isLate ? 'Late' : record.status}
                    </span>
                  </div>
                </div>
              </div>

              {record.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Notes:</span> {record.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredAttendance.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
            <p className="text-gray-600">No records found for the selected date and filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;