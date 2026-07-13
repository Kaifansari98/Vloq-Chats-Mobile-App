export type LoginRequest = {
  email: string;
  password: string;
  provider: "EMAIL";
};

export type AuthenticatedUser = {
  uuid: string;
  name: string;
  email: string;
  organizationName: string;
  organizationEmail: string;
  userTypeCode: string;
  profile_pic_url?: string | null;
};

export type LoginResponse = {
  message: string;
  accessToken: string;
  user: AuthenticatedUser;
};
