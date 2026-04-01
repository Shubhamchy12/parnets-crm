import api from './api';

export const taskService = {
  getAll: (params) => api.get('/tasks', { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  getByProject: (projectId) => api.get('/tasks', { params: { project: projectId, limit: 100 } }),
  // Returns active assignments grouped by project for the current employee
  getActiveAssignedProjects: () =>
    api.get('/assignments', { params: { status: 'active' } }).then(res => {
      const assignments = res.data?.data?.assignments || [];
      // Group by project
      const map = {};
      assignments.forEach(a => {
        const pid = a.project?._id;
        if (!pid) return;
        if (!map[pid]) map[pid] = { project: a.project, assignments: [] };
        map[pid].assignments.push(a);
      });
      return { data: { data: { projects: Object.values(map) } } };
    }),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  remove: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, data) => api.post(`/tasks/${id}/comments`, data),
  logTime: (id, data) => api.post(`/tasks/${id}/timelog`, data),
  uploadAttachment: (id, formData) => api.post(`/tasks/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
