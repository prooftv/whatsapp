import { supabase } from '../config/supabase.js';
import * as Sentry from '@sentry/node';

// Extract user from Supabase access token in Authorization header
export async function getUserFromRequest(req) {
  try {
    const authHeader = req.get('authorization') || '';
    const token = authHeader.split(' ')[1];
    if (!token) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.warn('Supabase getUser error', error.message || error);
      return null;
    }
    // data may contain { user }
    const user = data?.user || null;
    // Attach to Sentry context for observability
    if (user && process.env.SENTRY_DSN) {
      try { Sentry.setUser({ id: user.id, email: user.email }); } catch (e) {}
    }
    return user;
  } catch (err) {
    console.error('getUserFromRequest error', err.message || err);
    return null;
  }
}

export function requireAuth() {
  return async (req, res, next) => {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  };
}

export function requireRole(allowed = []) {
  return async (req, res, next) => {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;

    // Prefer explicit role mapping in `admin_roles` table
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) console.warn('admin_roles lookup error', error.message || error);

      const dbRole = data?.role;
      const metadataRole = user.user_metadata?.role;
      const role = dbRole || metadataRole || 'viewer';

      if (allowed.length === 0 || allowed.includes(role) || (role === 'super_admin' && allowed.includes('superadmin'))) {
        req.user_role = role;
        return next();
      }

      return res.status(403).json({ error: 'Forbidden - insufficient role' });
    } catch (err) {
      console.error('requireRole error', err.message || err);
      return res.status(500).json({ error: 'Role verification failed' });
    }
  };
}

export default {
  getUserFromRequest,
  requireAuth,
  requireRole
};
