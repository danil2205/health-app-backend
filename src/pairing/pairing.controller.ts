import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PairingService } from './pairing.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PairingCodeResponseDto } from './dto/responses/pairing-code-response.dto';
import { VerifyCodeRequestDto } from './dto/requests/verify-code-request.dto';
import { VerifyCodeResponseDto } from './dto/responses/verify-code-response.dto';
import { CheckLinkResponseDto } from './dto/responses/check-link-response.dto';
import { CheckLinkRequestDto } from './dto/requests/check-link-request.dto';

@Controller('pairing')
export class PairingController {
  constructor(private readonly pairingService: PairingService) {}

  @UseGuards(AuthGuard)
  @Get('code')
  async requestPairingCode(@Request() req): Promise<PairingCodeResponseDto> {
    return this.pairingService.requestPairingCode(req.user.userId);
  }

  @Post('verify')
  @HttpCode(200)
  async verifyPairingCode(
    @Body() verifyCodeDto: VerifyCodeRequestDto,
  ): Promise<VerifyCodeResponseDto> {
    return this.pairingService.verifyPairingCode(verifyCodeDto);
  }

  @UseGuards(AuthGuard)
  @Get('confirmCode')
  async requestConfirmationCode(
    @Request() req,
  ): Promise<{ success: boolean; code: string | null }> {
    return this.pairingService.requestConfirmationCode(req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('link')
  @HttpCode(200)
  async verifyConfirmationCode(
    @Request() req,
    @Body('isSame') isSame: boolean,
  ): Promise<{ success: boolean; message: string }> {
    return this.pairingService.verifyConfirmationCode(req.user.id, isSame);
  }

  @UseGuards(AuthGuard)
  @Delete('unlink')
  async unlinkWatch(
    @Request() req,
  ): Promise<{ success: boolean; message: string }> {
    return this.pairingService.unlinkWatch(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Get('status')
  async checkLink(
    @Query('watchId') watchId: string,
    @Request() req,
  ): Promise<CheckLinkResponseDto> {
    const userId = req.user?.userId;
    return this.pairingService.checkLink({ watchId, userId });
  }
}
