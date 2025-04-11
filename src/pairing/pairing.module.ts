import { Module } from '@nestjs/common';
import { PairingService } from './pairing.service';
import { PairingController } from './pairing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PairingCode } from './pairing-code.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PairingCode, User]), AuthModule],
  providers: [PairingService],
  controllers: [PairingController],
})
export class PairingModule {}
