export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface MediaAsset {
  id: string;
  title: string;
  altText: string;
  publicId: string;
  secureUrl: string;
  thumbnailUrl: string;
  folder: string;
  resourceType: 'image' | 'video' | 'raw';
  format: string;
  width: number;
  height: number;
  bytes: number;
  isHero: boolean;
  isCover: boolean;
  displayOrder: number;
  vehicleId: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}
