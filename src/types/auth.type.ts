export interface IJwtPayload {
  id: string;
  publicId: string;
  username: string;
  role: 'REGULAR' | 'ADMIN';
}

export enum EnumTypeJwt {
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFY = 'email_verify',
}
