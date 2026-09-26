import { UserRole } from '../../../core/models/auth.model';

export type AuditAction =
  'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'REGISTER' | 'SECURITY';

export const AUDIT_ACTIONS: AuditAction[] = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER', 'SECURITY',
];

export type AuditResult = 'success' | 'failure';

export interface AuditLog {
  id: number;
  createdAt: string;
  userId: number | null;
  username: string | null;
  userRole: UserRole | null;
  action: AuditAction;
  event: string;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, string | number | boolean | string[]> | null;
}

export interface AuditLogQuery {
  limit: number;
  offset: number;
  userId?: number;
  username?: string;
  actions?: AuditAction[];
  result?: AuditResult;
  from?: string;
  to?: string;
}
