export interface Organization {
  id: number;
  name: string;
  phone: string;
  address: string;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  phone: string;
  address: string;
  activationKey: string;
}

export interface OrganizationFormData {
  name: string;
  phone: string;
  address: string;
}