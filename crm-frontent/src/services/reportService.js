import api from './api';

export const reportService = {
  getSales:      (params) => api.get('/reports/sales',      { params }),
  getFinance:    (params) => api.get('/reports/finance',    { params }),
  getAttendance: (params) => api.get('/reports/attendance', { params }),
  getLeave:      (params) => api.get('/reports/leave',      { params }),
  getProjects:   (params) => api.get('/reports/projects',   { params }),
  getSupport:    (params) => api.get('/reports/support',    { params }),
};
