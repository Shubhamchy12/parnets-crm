import api from './api';

export const assignmentService = {
  getAll: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  getByProject: (projectId) => api.get(`/assignments/project/${projectId}`),
  assign: (data) => api.post('/assignments', data),
  remove: (id) => api.delete(`/assignments/${id}`),
  updateWorkPlan: (id, data) => api.patch(`/assignments/${id}/workplan`, data),
  updateDayWisePlan: (assignmentId, planId, data) => api.patch(`/assignments/${assignmentId}/daywise/${planId}`, data),
  addDayWisePlan: (assignmentId, data) => api.post(`/assignments/${assignmentId}/daywise`, data),
};
