import api from './api';

// POST /api/auth/login          → { email, password } → { success, data: { email, otp, otpSent } }
// POST /api/auth/verify-otp     → { email, otp }      → { success, data: { user, accessToken, refreshToken } }
// POST /api/auth/resend-otp     → { email }           → { success, data: { otp } }
// POST /api/auth/logout         → {}                  → { success }
// GET  /api/auth/me             → Bearer token        → { success, data: { user } }
// POST /api/auth/refresh-token  → { refreshToken }    → { success, data: { accessToken, refreshToken } }

export const authService = {
  login: (data) => api.post('/auth/login', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refreshToken: (data) => api.post('/auth/refresh-token', data),
  // These don't exist in backend yet — kept as stubs for future
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};
