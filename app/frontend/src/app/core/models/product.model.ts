export interface ProductType {
  productId: number;
  color: string;
  quantity: number;
  price: number;
  stock: number;
  image: string;
  _id?: string;
}

export interface Review {
  star: number;
  comment: string;
  userId?: string;
  userName?: string;
  date?: Date;
  _id?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  image: string;
  description: string;
  previewImg: string[];
  types: ProductType[];
  reviews: Review[];
  overallRating: number;
  stock?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  shopId?: string;
  shopName?: string;
}

export interface ProductQuery {
  limit: number;
  offset: number;
  category?: string;
  search?: string;
}
