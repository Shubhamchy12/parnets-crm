import api from './api';

export const leaveService = {
  getMyLeaves: (params) => api.get('/leaves', { params }),
  apply: (data) => api.post('/leaves', data),
  getOne: (id) => api.get(`/leaves/${id}`),
  getTeamLeaves: (params) => api.get('/leaves/team', { params }),
  getAllLeaves: (params) => api.get('/leaves/admin', { params }),
  approve: (id, data) => api.put(`/leaves/${id}/approve`, data),
  reject: (id, data) => api.put(`/leaves/${id}/reject`, data),
  getBalance: () => api.get('/leaves/balance'),
  getHolidays: () => api.get('/leaves/holidays'),
};
