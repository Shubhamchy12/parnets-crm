import api from './api';

export const timelogService = {
  log: (data) => api.post('/timelogs', data),
  getTimesheet: (params) => api.get('/timelogs/timesheet', { params }),
  getAll: (params) => api.get('/timelogs', { params }),
  update: (id, data) => api.put(`/timelogs/${id}`, data),
  remove: (id) => api.delete(`/timelogs/${id}`),
  approve: (id) => api.put(`/timelogs/${id}/approve`),
};
