import { Body, Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { PairingService } from './pairing.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PairingCodeResponseDto } from './dto/responses/pairing-code-response.dto';
import { VerifyCodeRequestDto } from './dto/requests/verify-code-request.dto';
import { VerifyCodeResponseDto } from './dto/responses/verify-code-response.dto';

@Controller('pairing')
export class PairingController {
  constructor(private readonly pairingService: PairingService) {}

  @UseGuards(AuthGuard)
  @Post('request-code')
	@HttpCode(201)
  async requestPairingCode(@Request() req): Promise<PairingCodeResponseDto> {
    return this.pairingService.generatePairingCode(req.user.userId);
  }

	@Post('verify-code')
	async verifyPairingCode(@Body() verifyCodeDto: VerifyCodeRequestDto): Promise<VerifyCodeResponseDto> {
		return this.pairingService.verifyPairingCode(verifyCodeDto);
	}
}
