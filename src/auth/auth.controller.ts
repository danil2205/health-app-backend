import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDto } from '../users/dto/user.dto';
import { AuthGuard } from './guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.validateToken(req.user.id);
  }

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
