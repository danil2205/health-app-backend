import { Module } from '@nestjs/common';
import { PairingService } from './pairing.service';
import { PairingController } from './pairing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PairingCode } from './pairing-code.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PairingCode]), AuthModule],
  providers: [PairingService],
  controllers: [PairingController],
})
export class PairingModule {}
