import api from './api';

export const departmentService = {
  getAll: () => api.get('/departments'),
};
