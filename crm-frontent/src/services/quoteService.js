import api from './api';

const downloadPdf = async (id, filename) => {
  const res = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const viewPdf = async (id) => {
  const res = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank');
};

export const quoteService = {
  getAll: (params) => api.get('/quotes', { params }),
  getOne: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  remove: (id) => api.delete(`/quotes/${id}`),
  send: (id) => api.post(`/quotes/${id}/send`),
  convertToInvoice: (id) => api.post(`/quotes/${id}/convert`),
  sendEmail: (id) => api.post(`/quotes/${id}/send-email`),
  sendWhatsApp: (id) => api.post(`/quotes/${id}/send-whatsapp`),
  downloadPdf,
  viewPdf,
};
