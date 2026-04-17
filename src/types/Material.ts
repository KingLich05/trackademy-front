export interface Material {
  id: string;
  title: string;
  description?: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  groupId: string;
  groupName: string;
  uploadedById: string;
  uploadedByName: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialsResponse {
  items: Material[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface MaterialFormData {
  title: string;
  description?: string;
  groupId: string;
  file: File | null;
}

export interface MaterialEditData {
  title: string;
  description?: string;
  isPrivate?: boolean;
}
