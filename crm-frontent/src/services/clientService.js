import api from './api';

export const clientService = {
  getAll: (params) => api.get('/clients', { params }),
  getOne: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  remove: (id) => api.delete(`/clients/${id}`),
  addNote: (id, data) => api.post(`/clients/${id}/notes`, data),
  addContact: (id, data) => api.post(`/clients/${id}/contacts`, data),
  removeContact: (id, contactId) => api.delete(`/clients/${id}/contacts/${contactId}`),
};
