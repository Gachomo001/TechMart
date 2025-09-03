import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

// Define user profile interface
interface UserProfile {
  id: string;
  role: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

// Define authenticated user interface
interface AuthenticatedUser {
  id: string;
  email?: string;
  profile: UserProfile;
}

// Extend Request interface to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

// Middleware to authenticate token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Token verification failed:', error);
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch failed:', profileError);
      res.status(403).json({ error: 'User profile not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || undefined,
      profile: profile as UserProfile
    } as AuthenticatedUser;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to require admin role
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.profile || !['admin', 'super_admin'].includes(req.user.profile.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
