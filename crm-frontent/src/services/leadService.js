import api from './api';

export const leadService = {
  getAll: (params) => api.get('/leads', { params }),
  getOne: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  remove: (id) => api.delete(`/leads/${id}`),
  addActivity: (id, data) => api.post(`/leads/${id}/activities`, data),
  updateStage: (id, data) => api.put(`/leads/${id}/stage`, data),
};
