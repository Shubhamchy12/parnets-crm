import api from './api';

export const progressService = {
  getAll: (params) => api.get('/progress', { params }),
  add: (data) => api.post('/progress', data),
  update: (id, data) => api.put(`/progress/${id}`, data),
  addComment: (id, comment) => api.post(`/progress/${id}/comment`, { comment }),
};
