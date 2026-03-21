import api from './api';

// GET  /api/attendance          → { success, data: { attendance[], pagination } }
//   params: page, limit, employee, date, status, month, year
// POST /api/attendance/checkin  → { date?, location? } → { success, data: { attendance } }
// POST /api/attendance/checkout → { date?, location? } → { success, data: { attendance } }
// GET  /api/attendance/today    → { success, data: { attendance } }
// GET  /api/attendance/stats    → { success, data: { totalRecords, statusStats, avgHours, lateArrivals } }
//   params: month, year
//
// Attendance fields: employee, date, checkIn.time, checkOut.time, totalHours, status, notes

export const attendanceService = {
  // Check-in / check-out
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (data) => api.post('/attendance/checkout', data),

  // Today's record for logged-in user
  getToday: () => api.get('/attendance/today'),

  // History — pass { month, year } or { date } or { employee }
  getHistory: (params) => api.get('/attendance', { params }),

  // Admin grid — pass { date } to get all employees for that day
  getAdminView: (params) => api.get('/attendance', { params }),

  // Stats (admin only)
  getStats: (params) => api.get('/attendance/stats', { params }),

  // Override doesn't exist in backend yet — stub
  override: (id, data) => api.put(`/attendance/${id}/override`, data),
};
