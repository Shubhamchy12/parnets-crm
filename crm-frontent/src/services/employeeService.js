import api from './api';

// GET    /api/employees                → { success, data: { employees, pagination, filters } }
// GET    /api/employees/stats          → { success, data: { totalEmployees, activeEmployees, ... } }
// GET    /api/employees/:id            → { success, data: { employee } }
// POST   /api/employees                → { success, data: { employee } }
// PUT    /api/employees/:id            → { success, data: { employee } }
// DELETE /api/employees/:id            → { success, message }
//
// Query params for GET /: page, limit, search, department, role
// Employee fields: name, email, phone, role, department, designation, salary, address, joiningDate

export const employeeService = {
  getAll: (params) => api.get('/employees', { params }),
  getStats: () => api.get('/employees/stats'),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  remove: (id) => api.delete(`/employees/${id}`),
  // Document & face endpoints don't exist in backend yet — stubs
  uploadDocument: (id, formData) => api.post(`/employees/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDocuments: (id) => api.get(`/employees/${id}/documents`),
  enrolFace: (id, data) => api.post(`/employees/${id}/enrol-face`, data),
  getMyFace: () => api.get('/employees/my-face'),
  getFace: (id) => api.get(`/employees/${id}/face`),
};
