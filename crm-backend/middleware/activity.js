import Activity from '../models/Activity.js';

export const logActivity = (action, entity, severity = 'low') => {
  return async (req, res, next) => {
    // Store original res.json to capture response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only log if the operation was successful
      if (data.success !== false) {
        // Log activity asynchronously
        setImmediate(async () => {
          try {
            await Activity.create({
              user: req.user?._id,
              action,
              entity,
              entityId: data.data?._id || req.params.id,
              details: {
                method: req.method,
                url: req.originalUrl,
                body: req.method !== 'GET' ? req.body : undefined,
                response: data
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              severity
            });
          } catch (error) {
            console.error('Failed to log activity:', error);
          }
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};