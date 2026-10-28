import jsonwebtoken from 'jsonwebtoken';
import User from '../models/user.js';

const { verify } = jsonwebtoken;

export async function authenticate(req, res, next) {
  const authorization = req.headers.authorization;
  const [scheme, token, ...extra] = authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token || extra.length) {
    return res.status(401).json({ error: 'A bearer access token is required.' });
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return next(new Error('JWT_SECRET must be configured with at least 32 characters.'));
  }

  try {
    const payload = verify(token, process.env.JWT_SECRET, { issuer: 'grievease' });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      return res.status(401).json({ error: 'Invalid access token.' });
    }
    const user = await User.findById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Account is unavailable.' });
    }
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired access token.' });
    }
    return next(error);
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions.' });
    }
    return next();
  };
}
