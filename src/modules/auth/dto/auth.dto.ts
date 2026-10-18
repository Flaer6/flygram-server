import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterRequest {
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'Имя пользователя должно содержать только латинские буквы и цифры',
  })
  @MaxLength(15)
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не менее 8 символов!' })
  @MaxLength(30, { message: 'Пароль не может состоять более 30 символов!' })
  @Matches(/^[\w!@#$%^&*()+\-=[\]{};':"\\|,.<>/?`~]+$/, {
    message: 'Пароль должен содержать только латинские символы',
  })
  password!: string;
}

export class LoginRequest {
  @MaxLength(30)
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не менее 8 символов!' })
  @MaxLength(30, { message: 'Пароль не может состоять более 30 символов!' })
  @Matches(/^[\w!@#$%^&*()+\-=[\]{};':"\\|,.<>/?`~]+$/, {
    message: 'Пароль должен содержать только латинские символы',
  })
  password!: string;
}
