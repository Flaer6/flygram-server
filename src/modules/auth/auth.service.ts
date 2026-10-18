import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import type { Request, Response } from 'express';
import { StringValue } from 'ms';
import { PrismaService } from '../../core/prisma/prisma.service';
import { isDev } from '../../lib/utils/isDev.util';
import { EnumTypeJwt, IJwtPayload } from '../../types/auth.type';
import { LoginRequest, RegisterRequest } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_TOKEN: StringValue;
  private readonly JWT_REFRESH_TOKEN: StringValue;
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.JWT_ACCESS_TOKEN =
      configService.getOrThrow<StringValue>('JWT_ACCESS_TOKEN');
    this.JWT_REFRESH_TOKEN =
      configService.getOrThrow<StringValue>('JWT_REFRESH_TOKEN');
  }

  async register(dto: RegisterRequest, res: Response) {
    const { password, username, email } = dto;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();
    const emailExists = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    const usernameExists = await this.prisma.user.findUnique({
      where: { usernameLower: normalizedUsername },
    });

    if (emailExists)
      throw new ConflictException('Пользователь с такой почтой существует!');
    if (usernameExists) throw new ConflictException('Это имя уже занято!');

    const user = await this.prisma.user.create({
      data: {
        username: username.trim(),
        usernameLower: normalizedUsername.trim(),
        email: normalizedEmail,
        password: await hash(password),

        // isEmailVerified: false,
      },
    });
    // const token = this.generateVerifyToken(user.id)

    // await this.resendService.sendVerificationEmail(
    // 	user.email,
    // 	token.verifyEmailToken,
    // )
    // return { message: 'Подтверди почту' }
    return this.auth(res, user.id, user.username, user.role);
  }

  async login(res: Response, dto: LoginRequest) {
    const { password, identifier } = dto;
    const normalizedIdentifier = identifier.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { usernameLower: normalizedIdentifier },
        ],
      },
      select: {
        id: true,
        email: true,
        password: true,
        username: true,
        role: true,
        // isEmailVerified: true,
      },
    });
    if (!user) throw new NotFoundException('Неверный логин или пароль');
    const validPass = await verify(user.password, password);
    if (!validPass) throw new NotFoundException('Неверный логин или пароль');
    // if (!user?.isEmailVerified) {
    // 	const token = this.generateVerifyToken(user.id)

    // 	await this.resendService.sendVerificationEmail(
    // 		user.email,
    // 		token.verifyEmailToken,
    // 	)

    // 	throw new BadRequestException('Подтвердите почту!')
    // }

    return this.auth(res, user.id, user.username, user.role);
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies['refreshToken'] as string | undefined;
    if (!refreshToken)
      throw new UnauthorizedException('Недействительный refresh-токен');
    const payload: IJwtPayload =
      await this.jwtService.verifyAsync(refreshToken);
    if (payload) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.id,
        },
        select: {
          id: true,
          username: true,
          publicId: true,
          role: true,
        },
      });
      if (!user) throw new NotFoundException('Пользователь не найден');

      return this.auth(res, user.id, user.username, user.publicId, user.role);
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async logout(res: Response) {
    this.setCookie(res, 'refreshToken', new Date(0));
  }

  async validate(payload: IJwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    return user;
  }

  private auth(
    res: Response,
    id: string,
    username: string,
    publicId: string,
    role: 'REGULAR' | 'ADMIN' = 'REGULAR',
  ) {
    const { accessToken, refreshToken } = this.generateTokens(
      id,
      username,
      publicId,
      role,
    );
    this.setCookie(
      res,
      refreshToken,
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    );

    return { accessToken };
  }

  private generateTokens(
    id: string,
    username: string,
    publicId: string,
    role: 'REGULAR' | 'ADMIN',
  ) {
    const payload: IJwtPayload = { id, username, publicId, role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_ACCESS_TOKEN,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_REFRESH_TOKEN,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateVerifyToken(id: string, version?: number) {
    const resetPasswordToken = this.jwtService.sign(
      { id, type: EnumTypeJwt.PASSWORD_RESET, version },
      {
        expiresIn: '5m',
        secret: this.configService.getOrThrow('RESET_SECRET'),
      },
    );
    const verifyEmailToken = this.jwtService.sign(
      { id, type: EnumTypeJwt.EMAIL_VERIFY },
      {
        expiresIn: '10m',
        secret: this.configService.getOrThrow('EMAIL_SECRET'),
      },
    );
    return {
      resetPasswordToken,
      verifyEmailToken,
    };
  }

  private setCookie(res: Response, value: string, expires: Date) {
    res.cookie('refreshToken', value, {
      httpOnly: true,
      expires,
      secure: !isDev(this.configService),
      sameSite: isDev(this.configService) ? 'lax' : 'none',
    });
  }
}
