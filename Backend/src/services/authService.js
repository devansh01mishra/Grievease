import bcrypt from 'bcrypt';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sign } from 'jsonwebtoken';
import User from '../models/user.js';
import { HttpError } from '../utils/httpError.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinimumLength = 12;

function validateIdentity({ name, email, password }) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) {
    throw new HttpError(400, 'Name must be between 2 and 120 characters.');
  }
  if (typeof email !== 'string' || !emailPattern.test(email.trim()) || email.length > 254) {
    throw new HttpError(400, 'A valid email address is required.');
  }
  if (typeof password !== 'string' || password.length < passwordMinimumLength || password.length > 128) {
    throw new HttpError(400, `Password must be between ${passwordMinimumLength} and 128 characters.`);
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department ?? null
  };
}

async function createUser({ name, email, password, role, department }) {
  if (!name || !email || !password) {
    throw new HttpError(400, 'Name, email, and password are required.');
  }
  validateIdentity({ name, email, password });
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new HttpError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    return await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role,
      department: department?.trim()
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, 'An account with this email already exists.');
    }
    throw error;
  }
}

export async function registerStudent(input) {
  const user = await createUser({ ...input, role: 'student' });
  return publicUser(user);
}

export async function createOfficial(input) {
  if (!input || typeof input.department !== 'string' || !input.department.trim()) {
    throw new HttpError(400, 'A department is required for official accounts.');
  }
  const user = await createUser({ ...input, role: 'official' });
  return publicUser(user);
}

export async function bootstrapAdministrator(input) {
  const configuredKey = process.env.ADMIN_BOOTSTRAP_KEY;
  if (!configuredKey || !input || typeof input.key !== 'string') {
    throw new HttpError(403, 'Administrator bootstrap is not enabled.');
  }
  const expected = createHmac('sha256', 'grievease-bootstrap').update(configuredKey).digest();
  const received = createHmac('sha256', 'grievease-bootstrap').update(input.key).digest();
  if (!timingSafeEqual(expected, received)) {
    throw new HttpError(403, 'Invalid administrator bootstrap key.');
  }
  if (await User.exists({ role: 'administrator' })) {
    throw new HttpError(409, 'An administrator account already exists.');
  }
  const user = await createUser({ ...input, role: 'administrator' });
  return publicUser(user);
}

export async function login(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Email and password are required.');
  const { email, password } = input;
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Email and password are required.');
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user || !user.active || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  const token = sign({ sub: user.id }, getJwtSecret(), { expiresIn: '8h', issuer: 'grievease' });
  return { token, user: publicUser(user) };
}
