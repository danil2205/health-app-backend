import { Body, Controller, Get, HttpCode, Post, Query, Request, UseGuards } from '@nestjs/common';
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
  @Post('request-code')
  async requestPairingCode(@Request() req): Promise<PairingCodeResponseDto> {
    return this.pairingService.generatePairingCode(req.user.userId);
  }

  @Post('verify-code')
  @HttpCode(200)
  async verifyPairingCode(
    @Body() verifyCodeDto: VerifyCodeRequestDto,
  ): Promise<VerifyCodeResponseDto> {
    return this.pairingService.verifyPairingCode(verifyCodeDto);
  }

  @Get('check-link')
  async checkLink(
    @Query() checkLinkQuery: CheckLinkRequestDto,
  ): Promise<CheckLinkResponseDto> {
    return this.pairingService.checkLink(checkLinkQuery);
  }
}
