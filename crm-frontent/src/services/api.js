const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Set auth token in localStorage
  setAuthToken(token) {
    localStorage.setItem('authToken', token);
  }

  // Remove auth token from localStorage
  removeAuthToken() {
    localStorage.removeItem('authToken');
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Authentication methods
  async login(email, password) {
    const response = await this.post('/auth/login', { email, password });
    return response;
  }

  async verifyOTP(email, otp) {
    const response = await this.post('/auth/verify-otp', { email, otp });
    if (response.success && response.data.accessToken) {
      this.setAuthToken(response.data.accessToken);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response;
  }

  async resendOTP(email) {
    return this.post('/auth/resend-otp', { email });
  }

  // Admin registration methods
  async checkAdminRegistrationAvailable() {
    return this.get('/auth/admin-registration-available');
  }

  async registerAdmin(name, email, password, confirmPassword) {
    const response = await this.post('/auth/register-admin', { 
      name, 
      email, 
      password, 
      confirmPassword 
    });
    return response;
  }

  async getRegistrationStatus() {
    return this.get('/auth/registration-status');
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await this.post('/auth/refresh-token', { refreshToken });
    if (response.success) {
      this.setAuthToken(response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.removeAuthToken();
      localStorage.removeItem('userData');
      localStorage.removeItem('refreshToken');
    }
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async changePassword(currentPassword, newPassword) {
    return this.post('/auth/change-password', { currentPassword, newPassword });
  }

  // User methods
  async getUsers(params = {}) {
    return this.get('/users', params);
  }

  async getUser(id) {
    return this.get(`/users/${id}`);
  }

  async updateUser(id, data) {
    return this.put(`/users/${id}`, data);
  }

  async deleteUser(id) {
    return this.delete(`/users/${id}`);
  }

  async getUserStats() {
    return this.get('/users/stats/overview');
  }

  // Client methods
  async getClients(params = {}) {
    return this.get('/clients', params);
  }

  async getClient(id) {
    return this.get(`/clients/${id}`);
  }

  async createClient(data) {
    return this.post('/clients', data);
  }

  async updateClient(id, data) {
    return this.put(`/clients/${id}`, data);
  }

  async deleteClient(id) {
    return this.delete(`/clients/${id}`);
  }

  async addClientNote(id, content) {
    return this.post(`/clients/${id}/notes`, { content });
  }

  // Project methods
  async getProjects(params = {}) {
    return this.get('/projects', params);
  }

  async getProject(id) {
    return this.get(`/projects/${id}`);
  }

  async createProject(data) {
    return this.post('/projects', data);
  }

  async updateProject(id, data) {
    return this.put(`/projects/${id}`, data);
  }

  async deleteProject(id) {
    return this.delete(`/projects/${id}`);
  }

  async addTeamMember(projectId, user, role) {
    return this.post(`/projects/${projectId}/team`, { user, role });
  }

  // Employee methods
  async getEmployees(params = {}) {
    return this.get('/employees', params);
  }

  async getEmployee(id) {
    return this.get(`/employees/${id}`);
  }

  async addEmployee(employeeData) {
    return this.post('/employees', employeeData);
  }

  async updateEmployee(id, employeeData) {
    return this.put(`/employees/${id}`, employeeData);
  }

  async deleteEmployee(id) {
    return this.delete(`/employees/${id}`);
  }

  async getEmployeeStats() {
    return this.get('/employees/stats');
  }

  // Attendance methods
  async getAttendance(params = {}) {
    return this.get('/attendance', params);
  }

  async checkIn(data = {}) {
    return this.post('/attendance/checkin', data);
  }

  async checkOut(data = {}) {
    return this.post('/attendance/checkout', data);
  }

  async getTodayAttendance() {
    return this.get('/attendance/today');
  }

  async getAttendanceStats(params = {}) {
    return this.get('/attendance/stats', params);
  }

  // Activity methods
  async getActivities(params = {}) {
    return this.get('/activities', params);
  }

  async getMyActivities(params = {}) {
    return this.get('/activities/my', params);
  }

  async getActivityStats() {
    return this.get('/activities/stats');
  }

  // Dashboard methods
  async getMonthlyStats() {
    return this.get('/dashboard/monthly-stats');
  }

  async getDashboardStats() {
    return this.get('/dashboard/stats');
  }

  // Support Tickets methods
  async getSupportTickets(params = {}) {
    return this.get('/support-tickets', params);
  }

  async createSupportTicket(data) {
    return this.post('/support-tickets', data);
  }

  async updateSupportTicket(id, data) {
    return this.put(`/support-tickets/${id}`, data);
  }

  async deleteSupportTicket(id) {
    return this.delete(`/support-tickets/${id}`);
  }

  // Invoice methods
  async getInvoices(params = {}) {
    return this.get('/invoices', params);
  }

  async createInvoice(data) {
    return this.post('/invoices', data);
  }

  async updateInvoice(id, data) {
    return this.put(`/invoices/${id}`, data);
  }

  async deleteInvoice(id) {
    return this.delete(`/invoices/${id}`);
  }

  // AMC methods
  async getAMCContracts(params = {}) {
    return this.get('/amc', params);
  }

  async createAMCContract(data) {
    return this.post('/amc', data);
  }

  async updateAMCContract(id, data) {
    return this.put(`/amc/${id}`, data);
  }

  async deleteAMCContract(id) {
    return this.delete(`/amc/${id}`);
  }

  // Accounting methods
  async getTransactions(params = {}) {
    return this.get('/accounting/transactions', params);
  }

  async createTransaction(data) {
    return this.post('/accounting/transactions', data);
  }

  async updateTransaction(id, data) {
    return this.put(`/accounting/transactions/${id}`, data);
  }

  async deleteTransaction(id) {
    return this.delete(`/accounting/transactions/${id}`);
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }
}

export default new ApiService();