export interface MarzbanTokenResponse {
  access_token: string;
  token_type: string;
}

export interface MarzbanUser {
  username: string;
  status: string | null;
  used_traffic: number;
  data_limit: number | null;
  expire: number | null;
  created_at: number | null;
  links: string[];
  subscription_url: string | null;
}

export interface MarzbanUserList {
  users: MarzbanUser[];
  total: number;
}

export interface MarzbanUserResponse {
  username: string;
  status: string | null;
  used_traffic: number;
  data_limit: number | null;
  expire: number | null;
  created_at: number | null;
  links: string[];
  subscription_url: string | null;
}