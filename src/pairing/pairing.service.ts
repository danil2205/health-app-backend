import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PairingCode } from './pairing-code.entity';
import { Repository } from 'typeorm';
import { PairingCodeResponseDto } from './dto/responses/pairing-code-response.dto';
import { VerifyCodeRequestDto } from './dto/requests/verify-code-request.dto';
import { VerifyCodeResponseDto } from './dto/responses/verify-code-response.dto';

@Injectable()
export class PairingService {
  constructor(
    @InjectRepository(PairingCode)
    private readonly pairingCodeRepository: Repository<PairingCode>,
  ) {}

  generateCode(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  async generatePairingCode(userId: string): Promise<PairingCodeResponseDto> {
    let code: string = this.generateCode();

    while (await this.pairingCodeRepository.findOne({ where: { code } })) {
      code = this.generateCode();
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(new Date().getMinutes() + 5);

    const newPairingCode = this.pairingCodeRepository.create({
      code,
      userId,
      expiresAt,
    });
    this.pairingCodeRepository.save(newPairingCode);

    return { code, expiresAt };
  }

  async verifyPairingCode(
    verifyCodeDto: VerifyCodeRequestDto,
  ): Promise<VerifyCodeResponseDto> {
    const { code, watchId } = verifyCodeDto;

    const pairingCode = await this.pairingCodeRepository.findOne({
      where: { code },
    });
    if (!pairingCode) {
      throw new NotFoundException('Pairing code not found');
    }

    if (pairingCode.isUsed || pairingCode.expiresAt < new Date()) {
      throw new BadRequestException('Pairing code is either used or expired');
    }

    await this.pairingCodeRepository.update(pairingCode.id, {
      isUsed: true,
      watchId,
    });

    return { success: true };
  }

  async updatePairingCodeAttrs(
    id: string,
    attrs: Partial<PairingCode>,
  ): Promise<PairingCode> {
    const pairingCode = await this.pairingCodeRepository.findOneBy({ id });
    if (!pairingCode) {
      throw new NotFoundException('Pairing code not found');
    }
    Object.assign(pairingCode, attrs);
    return this.pairingCodeRepository.save(pairingCode);
  }
}
