export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface MediaUsage {
  type: string; // 'vehicle-gallery' | 'vehicle-hero' | 'vehicle-cover' | 'vehicle-thumbnail' | 'branding'
  id: string;
  label: string;
}

export interface MediaImage {
  id: string;
  fileId: string; // ImageKit-issued file ID
  filePath: string; // e.g. /mideeye-motors/vehicles/front.jpg
  url: string; // base delivery URL, no transform params
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  mimeType: string | null;
  altText: string;
  caption: string;
  folder: string | null;
  tags: string[];
  createdAt: string;
  inUse: boolean;
  usedBy: MediaUsage[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}
