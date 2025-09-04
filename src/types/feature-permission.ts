export interface PermissionItem {
  id?: number;
  permission_name: string;
  title: string;
  companyId?: number;
  enabled: boolean;
  children?: PermissionItem[];
}

export interface StaticPermissionItem {
  title: string;
  permission_name: string;
  status: boolean;
  children?: StaticPermissionItem[];
}

export interface PermissionUpdate {
  permission_name: string;
  enabled: boolean;
  companyId: number;
}
export interface PermissionCreate {
  permission_name: string;
  title: string;
  enabled: boolean;
  companyId: number;
}
