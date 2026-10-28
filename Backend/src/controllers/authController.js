import * as authService from '../services/authService.js';

export async function registerStudent(req, res) {
  const user = await authService.registerStudent(req.body);
  res.status(201).json({ user });
}

export async function login(req, res) {
  res.json(await authService.login(req.body));
}

export async function bootstrapAdministrator(req, res) {
  const user = await authService.bootstrapAdministrator(req.body);
  res.status(201).json({ user });
}

export function currentUser(req, res) {
  const { id, name, email, role, department } = req.user;
  res.json({ user: { id, name, email, role, department: department ?? null } });
}
