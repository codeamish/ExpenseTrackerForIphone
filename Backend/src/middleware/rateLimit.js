const buckets = new Map();

export function rateLimit({ windowMs = 15 * 60_000, limit = 10 } = {}) {
    return function limitRequests(req, res, next) {
        const key = req.ip;
        const now = Date.now();
        if (buckets.size > 10_000) {
            for (const [storedKey, stored] of buckets) if (stored.resetAt <= now) buckets.delete(storedKey);
        }
        const current = buckets.get(key);
        const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
        bucket.count++;
        buckets.set(key, bucket);
        res.set('RateLimit-Limit', String(limit));
        res.set('RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
        if (bucket.count > limit) {
            res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
            return res.status(429).json({ error: 'Too many attempts. Try again later.' });
        }
        return next();
    };
}
