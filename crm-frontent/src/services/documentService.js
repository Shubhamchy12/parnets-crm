import api from './api';

export const documentService = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (data) => api.post('/documents', data),
  remove: (id) => api.delete(`/documents/${id}`),
  share: (id, data) => api.post(`/documents/${id}/share`, data),
};
