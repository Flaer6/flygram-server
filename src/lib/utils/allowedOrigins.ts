import { ConfigService } from '@nestjs/config';

export const getAllowedOrigins = (configService: ConfigService): string[] => {
  return configService
    .getOrThrow<string>('CLIENT_URLS')
    .split(',')
    .map((o) => o.trim());
};
