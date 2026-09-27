import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Product, ProductQuery } from '@core/models/product.model';
import { ApiResponse, Page } from '@core/models/api.model';
import { API_BASE_URL } from '@core/config/api-config';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly baseUrl = `${inject(API_BASE_URL)}/products`;

  constructor(private http: HttpClient) {}

  getProducts(query: ProductQuery): Observable<Page<Product>> {
    let params = new HttpParams().set('limit', query.limit).set('offset', query.offset);
    if (query.category) params = params.set('category', query.category);
    if (query.search) params = params.set('search', query.search);

    return this.http
      .get<ApiResponse<Product[]>>(this.baseUrl, { params })
      .pipe(map((res) => ({ items: res.data, total: res.meta?.total ?? res.data.length })));
  }

  getCategories(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/categories`).pipe(map((res) => res.data));
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }
}
