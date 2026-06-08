export interface CustomCategoryDto {
  id: number;
  name: string;
  description: string;
  createdByUserId: number;
  createdByUsername: string | null;
}

export interface CustomCategoryCreateRequest {
  name: string;
  description: string;
}

export interface CustomCategoryUpdateRequest {
  name?: string;
  description?: string;
}
