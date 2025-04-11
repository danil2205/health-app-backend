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
import { CheckLinkResponseDto } from './dto/responses/check-link-response.dto';
import { CheckLinkRequestDto } from './dto/requests/check-link-request.dto';
import { User } from 'src/users/users.entity';

@Injectable()
export class PairingService {
  constructor(
    @InjectRepository(PairingCode)
    private readonly pairingCodeRepository: Repository<PairingCode>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  generateCode(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  async generatePairingCode(userId: string): Promise<PairingCodeResponseDto> {
    const pairingCode = await this.pairingCodeRepository.findOne({
      where: { userId },
    });

    if (pairingCode) {
      if (pairingCode.expiresAt > new Date()) {
        return { code: pairingCode.code, expiresAt: pairingCode.expiresAt };
      }
    }

    let code: string;
    do {
      code = this.generateCode();
    } while (await this.pairingCodeRepository.findOne({ where: { code } }));

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

    if (pairingCode.expiresAt < new Date()) {
      throw new BadRequestException('Pairing code is expired');
    }

    const user = await this.userRepository.findOneBy({
      id: pairingCode.userId,
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.watchId = watchId;
    await this.userRepository.save(user);
    await this.pairingCodeRepository.delete(pairingCode.id);

    return { success: true };
  }

  async checkLink(
    CheckLinkRequestDto: CheckLinkRequestDto,
  ): Promise<CheckLinkResponseDto> {
    const { userId, watchId } = CheckLinkRequestDto;

    if (userId) {
      const user = await this.userRepository.findOneBy({ id: userId });
      return { isLinked: !!user?.watchId };
    } else {
      const user = await this.userRepository.findOne({ where: { watchId } });
      return { isLinked: !!user };
    }
  }
}
