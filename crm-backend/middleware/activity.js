import Activity from '../models/Activity.js';

export const logActivity = (action, entity, severity = 'low') => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Respond immediately — don't wait for activity log
      const result = originalJson(data);

      // Fire-and-forget activity log only on success
      if (data?.success !== false) {
        setImmediate(() => {
          try {
            const userId = req.user?._id;
            // Skip logging if userId can't be cast to ObjectId (fallback users)
            const isValidObjectId = userId && /^[a-f\d]{24}$/i.test(String(userId));
            if (!isValidObjectId) return;

            const rawEntityId = data.data?._id || data.data?.quotation?._id || req.params?.id;
            const isValidEntityId = rawEntityId && /^[a-f\d]{24}$/i.test(String(rawEntityId));

            Activity.create({
              user: userId,
              action,
              entity,
              ...(isValidEntityId ? { entityId: rawEntityId } : {}),
              details: {
                method: req.method,
                url: req.originalUrl,
              },
              ipAddress: req.ip || req.connection?.remoteAddress,
              userAgent: req.get('User-Agent'),
              severity,
            }).catch(() => {}); // silently ignore failures
          } catch (_) {}
        });
      }

      return result;
    };

    next();
  };
};