import { InjectionToken } from '@angular/core';
import { environment } from '@env/environment';

/**
 * A token rather than a plain const, so a spec can point the services at a test host instead of
 * hardcoding whatever `environment.ts` happens to hold.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => `${environment.apiUrl}/api/v1`,
});
