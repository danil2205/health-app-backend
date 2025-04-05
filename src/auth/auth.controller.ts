import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDto } from '../users/dto/user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() userDto: UserDto) {
    return this.authService.createUser(userDto);
  }

  @Post('signin')
  async signin(@Body() userDto: UserDto) {
    const user = await this.authService.validateUser(
      userDto.email,
      userDto.password,
    );
    return this.authService.login(user.email, user.id);
  }
}
