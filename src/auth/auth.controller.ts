import { Body, Controller, Get, Post, Put, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDto } from '../users/dto/user.dto';
import { AuthGuard } from './guards/auth.guard';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.validateToken(req.user.userId);
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

  @UseGuards(AuthGuard)
  @Put('update')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  async updateProfile(
    @Request() req,
    @Body('userData') userData: string,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const updateUserDto: UpdateUserDto = JSON.parse(userData);
    if (avatar) {
      updateUserDto.avatar = avatar.filename;
    }
    return this.authService.updateUser(req.user.userId, updateUserDto);
  }
}
