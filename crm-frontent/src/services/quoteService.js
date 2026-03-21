import api from './api';

export const quoteService = {
  getAll: (params) => api.get('/quotes', { params }),
  getOne: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  remove: (id) => api.delete(`/quotes/${id}`),
  send: (id) => api.post(`/quotes/${id}/send`),
  convertToInvoice: (id) => api.post(`/quotes/${id}/convert`),
};
