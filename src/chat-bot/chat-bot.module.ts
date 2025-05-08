import { Module } from '@nestjs/common';
import { ChatBotService } from './chat-bot.service';
import { ChatBotController } from './chat-bot.controller';
import { AuthModule } from '../auth/auth.module';
import { HealthDataModule } from '../health-data/health-data.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat]), AuthModule, HealthDataModule],
  providers: [ChatBotService],
  controllers: [ChatBotController],
})
export class ChatBotModule {}
