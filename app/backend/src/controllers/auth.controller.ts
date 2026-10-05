import { Request, Response } from 'express';
import { config } from '../config';
import { auditAs } from '../middleware/audit';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { tokenService, userService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../utils/refreshCookie';
import { currentUserId, requestSource } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { parse } from '../utils/validation';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(registerSchema, req.body);

  // Only these fields are read, so a "role" sent here is ignored and self-registration can never
  // create an admin (OWASP API3 mass assignment)
  const user = await userService.createUser({
    username: input.username,
    password: input.password,
    firstName: input.firstName ?? input.username,
    lastName: input.lastName ?? '',
  });

  const { accessToken, refreshToken } = await tokenService.issueSession(user);
  setRefreshCookie(res, refreshToken);

  auditAs(res, {
    action: 'REGISTER',
    event: 'user.registered',
    userId: user.id,
    username: user.username,
    userRole: user.role,
  });
  sendSuccess(res, { user, accessToken }, 'Account created successfully.', 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(loginSchema, req.body);

  const user = await userService.authenticate(input.username, input.password);
  if (!user) {
    auditAs(res, { action: 'LOGIN_FAILED', event: 'user.login_failed', username: input.username });
    throw new AppError('Invalid username or password', 401, 'invalid_credentials');
  }

  const { accessToken, refreshToken } = await tokenService.issueSession(user);
  setRefreshCookie(res, refreshToken);

  auditAs(res, {
    action: 'LOGIN',
    event: 'user.logged_in',
    userId: user.id,
    username: user.username,
    userRole: user.role,
  });
  sendSuccess(res, { user, accessToken }, 'Login successful! Welcome back.');
});

export const demo = asyncHandler(async (_req: Request, res: Response) => {
  const user = config.demo.loginEnabled ? await userService.findByUsername(config.demo.username) : null;
  if (!user || user.role !== 'customer') {
    throw new AppError('Demo access is not available', 404, 'not_found');
  }

  const { accessToken, refreshToken } = await tokenService.issueSession(user);
  setRefreshCookie(res, refreshToken);

  auditAs(res, {
    action: 'LOGIN',
    event: 'user.demo_logged_in',
    userId: user.id,
    username: user.username,
    userRole: user.role,
  });
  sendSuccess(res, { user, accessToken }, 'Signed in to the demo account.');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = readRefreshCookie(req);
  if (!token) throw new AppError('Invalid or expired refresh token', 401, 'token_invalid');

  const { user, accessToken, refreshToken } = await tokenService.rotateRefreshToken(
    token,
    requestSource(req),
  );
  setRefreshCookie(res, refreshToken);

  sendSuccess(res, { user, accessToken }, 'Token refreshed successfully.');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = readRefreshCookie(req);
  if (token) {
    const userId = await tokenService.revokeSession(token);
    if (userId) auditAs(res, { action: 'LOGOUT', event: 'user.logged_out', userId });
  }
  clearRefreshCookie(res);
  sendSuccess(res, null, 'Logged out successfully.');
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await tokenService.revokeAllSessions(currentUserId(req));
  clearRefreshCookie(res);
  auditAs(res, { action: 'LOGOUT', event: 'user.logged_out_everywhere' });
  sendSuccess(res, null, 'All sessions revoked.');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await userService.requireUser(currentUserId(req)), 'User fetched successfully.');
});
