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

  async requestPairingCode(userId: string): Promise<PairingCodeResponseDto> {
    await this.pairingCodeRepository.delete({ userId });

    const watchCode: string = this.generateCode();
    let phoneCode: string;
    do {
      phoneCode = this.generateCode();
    } while (
      await this.pairingCodeRepository.findOne({ where: { phoneCode } })
    );

    const createdCode = this.pairingCodeRepository.create({
      phoneCode,
      watchCode,
      userId,
    });
    const savedCode = await this.pairingCodeRepository.save(createdCode);

    return { code: phoneCode, expiresAt: savedCode.expiresAt };
  }

  async verifyPairingCode(
    verifyCodeDto: VerifyCodeRequestDto,
  ): Promise<VerifyCodeResponseDto> {
    const { code, watchId } = verifyCodeDto;

    const pairingCode = await this.pairingCodeRepository.findOne({
      where: { phoneCode: code },
    });

    if (!pairingCode) {
      throw new NotFoundException('Pairing code not found');
    }

    if (pairingCode.expiresAt < new Date()) {
      throw new BadRequestException('Pairing code is expired');
    }

    if (pairingCode.isPhoneCodeUsed) {
      throw new BadRequestException('Pairing code has already been used');
    }

    pairingCode.isPhoneCodeUsed = true;
    pairingCode.watchId = watchId;
    await this.pairingCodeRepository.save(pairingCode);

    return { code: pairingCode.watchCode };
  }

  async requestConfirmationCode(userId: string): Promise<{ code: string }> {
    const pairingCode = await this.pairingCodeRepository.findOneBy({ userId });

    if (!pairingCode) {
      throw new NotFoundException('Pairing code not found');
    }

    if (pairingCode.isPhoneCodeUsed) {
      return { code: pairingCode.watchCode };
    }

    return { code: '' };
  }

  async verifyConfirmationCode(userId: string, isSame: boolean): Promise< { success: boolean} > {
    const pairingCode = await this.pairingCodeRepository.findOneBy({ userId });

    if (!pairingCode) {
      throw new NotFoundException('Pairing code not found');
    }

    if (!isSame) {
      pairingCode.isPhoneCodeUsed = false;
      await this.pairingCodeRepository.save(pairingCode);
      return { success: isSame};
    }

    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.watchId = pairingCode.watchId;
    await this.userRepository.save(user);
    await this.pairingCodeRepository.delete(pairingCode.id);

    return { success: isSame };
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
