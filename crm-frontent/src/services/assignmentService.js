import api from './api';

export const assignmentService = {
  getAll: (params) => api.get('/assignments', { params }),
  getByProject: (projectId) => api.get(`/assignments/project/${projectId}`),
  assign: (data) => api.post('/assignments', data),
  remove: (id) => api.delete(`/assignments/${id}`),
};
