import api from './api';

export const contractService = {
  getAll: (params) => api.get('/contracts', { params }),
  getOne: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  remove: (id) => api.delete(`/contracts/${id}`),
  send: (id) => api.post(`/contracts/${id}/send`),
};
