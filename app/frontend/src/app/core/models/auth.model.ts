export type UserRole = 'customer' | 'admin';

export interface AuthUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}
