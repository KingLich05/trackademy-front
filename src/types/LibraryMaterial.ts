export interface LibraryMaterial {
  id: string;
  title: string;
  description?: string | null;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryMaterialsResponse {
  items: LibraryMaterial[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface LibraryMaterialEditData {
  title: string;
  description?: string;
}
