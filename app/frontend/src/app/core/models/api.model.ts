export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  meta?: PageMeta;
}

export interface PageMeta {
  limit: number;
  offset: number;
  total: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}
