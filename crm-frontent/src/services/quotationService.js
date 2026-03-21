import api from './api';

const downloadPdf = async (id, filename) => {
  const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const viewPdf = async (id) => {
  const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank');
};

export const quotationService = {
  getAll: (params) => api.get('/quotations', { params }),
  getOne: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  update: (id, data) => api.put(`/quotations/${id}`, data),
  remove: (id) => api.delete(`/quotations/${id}`),
  sendEmail: (id) => api.post(`/quotations/${id}/send-email`),
  sendWhatsApp: (id) => api.post(`/quotations/${id}/send-whatsapp`),
  updateStatus: (id, status) => api.patch(`/quotations/${id}/status`, { status }),
  downloadPdf,
  viewPdf,
};
