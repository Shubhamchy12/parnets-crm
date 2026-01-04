import Session from '../models/Session.js';
import OTP from '../models/OTP.js';
import jwtService from './jwtService.js';
import enhancedOtpService from './enhancedOtpService.js';

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.intervals = [];
  }

  // Start all cleanup tasks
  start() {
    if (this.isRunning) {
      console.log('Cleanup service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🧹 Starting cleanup service...');

    // Cleanup inactive sessions every 30 minutes
    const sessionCleanup = setInterval(async () => {
      try {
        await this.cleanupInactiveSessions();
      } catch (error) {
        console.error('Session cleanup error:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Cleanup expired OTPs every 15 minutes
    const otpCleanup = setInterval(async () => {
      try {
        await this.cleanupExpiredOTPs();
      } catch (error) {
        console.error('OTP cleanup error:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Cleanup old sessions every 24 hours
    const oldSessionCleanup = setInterval(async () => {
      try {
        await this.cleanupOldSessions();
      } catch (error) {
        console.error('Old session cleanup error:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Store intervals for cleanup
    this.intervals = [sessionCleanup, otpCleanup, oldSessionCleanup];

    console.log('✅ Cleanup service started successfully');
  }

  // Stop all cleanup tasks
  stop() {
    if (!this.isRunning) {
      console.log('Cleanup service is not running');
      return;
    }

    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isRunning = false;

    console.log('🛑 Cleanup service stopped');
  }

  // Cleanup inactive sessions
  async cleanupInactiveSessions() {
    try {
      const inactivityThreshold = 24 * 60 * 60 * 1000; // 24 hours
      const result = await jwtService.cleanupInactiveSessions(inactivityThreshold);
      
      if (result && result.modifiedCount > 0) {
        console.log(`🧹 Cleaned up ${result.modifiedCount} inactive sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
    }
  }

  // Cleanup expired OTPs
  async cleanupExpiredOTPs() {
    try {
      const result = await enhancedOtpService.cleanupExpiredOTPs();
      
      if (result && result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired OTPs`);
      }
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  // Cleanup old terminated sessions
  async cleanupOldSessions() {
    try {
      const retentionDays = 30; // Keep terminated sessions for 30 days
      const result = await Session.cleanupOldSessions(retentionDays);
      
      if (result && result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} old sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
    }
  }

  // Manual cleanup - can be called via API endpoint
  async runManualCleanup() {
    try {
      console.log('🧹 Running manual cleanup...');
      
      const results = await Promise.allSettled([
        this.cleanupInactiveSessions(),
        this.cleanupExpiredOTPs(),
        this.cleanupOldSessions()
      ]);

      const summary = {
        inactiveSessions: 'completed',
        expiredOTPs: 'completed',
        oldSessions: 'completed',
        errors: []
      };

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const taskNames = ['inactiveSessions', 'expiredOTPs', 'oldSessions'];
          summary[taskNames[index]] = 'failed';
          summary.errors.push({
            task: taskNames[index],
            error: result.reason.message
          });
        }
      });

      console.log('✅ Manual cleanup completed');
      return summary;
    } catch (error) {
      console.error('Manual cleanup error:', error);
      throw error;
    }
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const [sessionStats, otpStats] = await Promise.all([
        Session.aggregate([
          {
            $group: {
              _id: null,
              totalSessions: { $sum: 1 },
              activeSessions: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ['$isActive', true] }, { $gt: ['$expiresAt', new Date()] }] },
                    1,
                    0
                  ]
                }
              },
              inactiveSessions: {
                $sum: {
                  $cond: [{ $eq: ['$isActive', false] }, 1, 0]
                }
              },
              expiredSessions: {
                $sum: {
                  $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0]
                }
              }
            }
          }
        ]),
        OTP.aggregate([
          {
            $group: {
              _id: null,
              totalOTPs: { $sum: 1 },
              usedOTPs: { $sum: { $cond: ['$isUsed', 1, 0] } },
              expiredOTPs: { $sum: { $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0] } },
              validOTPs: {
                $sum: {
                  $cond: [
                    { 
                      $and: [
                        { $eq: ['$isUsed', false] },
                        { $gt: ['$expiresAt', new Date()] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ])
      ]);

      return {
        sessions: sessionStats[0] || {
          totalSessions: 0,
          activeSessions: 0,
          inactiveSessions: 0,
          expiredSessions: 0
        },
        otps: otpStats[0] || {
          totalOTPs: 0,
          usedOTPs: 0,
          expiredOTPs: 0,
          validOTPs: 0
        },
        lastCleanup: new Date().toISOString(),
        isRunning: this.isRunning
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
}

export default new CleanupService();