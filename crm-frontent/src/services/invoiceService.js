import api from './api';

const downloadPdf = async (id, filename) => {
  const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const viewPdf = async (id) => {
  const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank');
};

export const invoiceService = {
  getAll: (params) => api.get('/invoices', { params }),
  getOne: (id) => api.get(`/invoices/${id}`),
  getByQuote: (quoteId) => api.get(`/invoices/by-quote/${quoteId}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  remove: (id) => api.delete(`/invoices/${id}`),
  send: (id) => api.post(`/invoices/${id}/send`),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payment`, data),
  sendEmail: (id) => api.post(`/invoices/${id}/send-email`),
  sendWhatsApp: (id) => api.post(`/invoices/${id}/send-whatsapp`),
  getApprovedQuotations: () => api.get('/invoices/approved-quotations'),
  createInstallmentPlan: (id, data) => api.post(`/invoices/${id}/installment-plan`, data),
  updateInstallment: (id, installmentId, data) => api.put(`/invoices/${id}/installment-plan/${installmentId}`, data),
  removeInstallmentPlan: (id) => api.delete(`/invoices/${id}/installment-plan`),
  downloadPdf,
  viewPdf,
};
