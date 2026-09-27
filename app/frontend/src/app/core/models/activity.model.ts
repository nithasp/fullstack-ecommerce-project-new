/** One page view as the app reports it; the server fills in the user, time and request details. */
export interface PageViewReport {
  path: string;
  page?: string;
}
