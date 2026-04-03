import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwtService from '../services/jwtService.js';
import enhancedOtpService from '../services/enhancedOtpService.js';

const router = express.Router();
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log(`[LOGIN] email=${email} found=${!!user} hasPassword=${!!user?.password} status=${user?.status}`);

    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!user.password) return res.status(401).json({ success: false, message: 'Account has no password set. Contact admin.' });

    const match = await bcrypt.compare(password, user.password);
    console.log(`[LOGIN] passwordMatch=${match}`);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (user.status !== 'active') return res.status(401).json({ success: false, message: `Account is ${user.status}. Contact admin.` });

    const otp = generateOTP();
    otpStore[email.toLowerCase()] = { otp, expiry: Date.now() + 10 * 60 * 1000, userId: user._id.toString() };
    console.log(`\n🔐 OTP for ${email}: ${otp}\n`);

    // Send OTP email to user and admin notification
    try {
      await enhancedOtpService.sendOTPEmail(user.email, otp, user.name, 'login');
      console.log(`✅ OTP email sent to ${user.email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send OTP email:', emailError.message);
      // Continue even if email fails (OTP still shown in console for dev)
    }

    res.json({ success: true, message: 'OTP sent to your email', data: { email: user.email, otpSent: true, otp, expiresIn: 10 } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const record = otpStore[email.toLowerCase()];
    if (!record) return res.status(401).json({ success: false, message: 'No OTP found. Please login again.' });
    if (Date.now() > record.expiry) { delete otpStore[email.toLowerCase()]; return res.status(401).json({ success: false, message: 'OTP expired.' }); }
    if (record.otp !== otp) return res.status(401).json({ success: false, message: 'Invalid OTP.' });

    delete otpStore[email.toLowerCase()];

    const user = await User.findById(record.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await User.updateOne({ _id: record.userId }, { lastLogin: new Date() });

    const { accessToken, refreshToken } = jwtService.generateSimpleTokens({
      _id: user._id, email: user.email, role: user.role, permissions: user.permissions, status: user.status
    });

    res.json({
      success: true, message: 'OTP verified successfully',
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, department: user.department, designation: user.designation },
        accessToken, refreshToken
      }
    });
  } catch (e) {
    console.error('Verify OTP error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const otp = generateOTP();
    otpStore[email.toLowerCase()] = { otp, expiry: Date.now() + 10 * 60 * 1000, userId: user._id.toString() };
    console.log(`\n🔐 New OTP for ${email}: ${otp}\n`);

    // Send OTP email to user and admin notification
    try {
      await enhancedOtpService.sendOTPEmail(user.email, otp, user.name, 'login');
      console.log(`✅ Resend OTP email sent to ${user.email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send OTP email:', emailError.message);
    }

    res.json({ success: true, message: 'OTP sent to your email', data: { email: user.email, otp, expiresIn: 10 } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const decoded = jwtService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
    const tokens = jwtService.generateSimpleTokens({ _id: user._id, email: user.email, role: user.role, permissions: user.permissions, status: user.status });
    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// GET /api/auth/admin-registration-available
router.get('/admin-registration-available', async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'super_admin' });
    res.json({ success: true, data: { available: count === 0 } });
  } catch {
    res.json({ success: true, data: { available: false } });
  }
});

// GET /api/auth/check-user/:email  — debug only, remove in production
router.get('/check-user/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() }).select('+password');
    if (!user) return res.json({ found: false });
    res.json({
      found: true,
      status: user.status,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const decoded = jwtService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'currentPassword and newPassword required' });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    const otp = generateOTP();
    otpStore[email.toLowerCase()] = { otp, expiry: Date.now() + 10 * 60 * 1000, type: 'reset', userId: user._id.toString() };
    console.log(`\n🔑 Password reset OTP for ${email}: ${otp}\n`);
    
    // Send password reset OTP email
    try {
      await enhancedOtpService.sendOTPEmail(user.email, otp, user.name, 'password-reset');
      console.log(`✅ Password reset OTP email sent to ${user.email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send password reset OTP email:', emailError.message);
    }
    
    res.json({ success: true, message: 'Password reset OTP sent to your email', data: { otp } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'email, otp, newPassword required' });
    const record = otpStore[email.toLowerCase()];
    if (!record || record.otp !== otp || Date.now() > record.expiry) return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    const user = await User.findById(record.userId).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.password = newPassword;
    await user.save();
    delete otpStore[email.toLowerCase()];
    res.json({ success: true, message: 'Password reset successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
