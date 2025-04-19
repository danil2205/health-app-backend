import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { UserDto } from '../users/dto/user.dto';
import { User } from '../users/users.entity';
import {
  ALREADY_REGISTERED_ERROR,
  USER_NOT_FOUND_ERROR,
  WRONG_PASSWORD_ERROR,
  INVALID_TOKEN_ERROR,
} from './auth.constants';
import * as bcrypt from 'bcrypt';
import {  plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async getByEmail(email: string) {
    return this.userService.findOneByEmail(email);
  }

  async validateToken(userId: string) {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new UnauthorizedException(INVALID_TOKEN_ERROR);
    }

    return plainToInstance(User, user);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.getByEmail(email);

    if (!user) {
      throw new UnauthorizedException(USER_NOT_FOUND_ERROR);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(WRONG_PASSWORD_ERROR);
    }

    return user;
  }

  async createUser(user: UserDto) {
    const existingUser = await this.userService.findOneByEmail(user.email);

    if (existingUser) {
      throw new BadRequestException(ALREADY_REGISTERED_ERROR);
    }

    const username = user.email.split('@')[0];
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser = await this.userService.create({
      ...user,
      password: hashedPassword,
      username,
    } as User);
    return this.login(newUser.email, newUser.id);
  }

  async login(email: string, userId: string) {
    const payload = { email, userId };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
