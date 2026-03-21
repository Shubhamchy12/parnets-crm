import api from './api';

export const projectService = {
  getAll: (params) => api.get('/projects', { params }),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  remove: (id) => api.delete(`/projects/${id}`),
  addMember: (id, data) => api.post(`/projects/${id}/team`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/team/${userId}`),
  bulkSetTeam: (id, members) => api.put(`/projects/${id}/team`, { members }),
  getMilestones: (id) => api.get(`/projects/${id}/milestones`),
  addMilestone: (id, data) => api.post(`/projects/${id}/milestones`, data),
  updateMilestone: (id, msId, data) => api.put(`/projects/${id}/milestones/${msId}`, data),
  getAgreements: (id) => api.get(`/projects/${id}/agreements`),
  uploadAgreement: (id, data) => api.post(`/projects/${id}/agreements`, data),
};
