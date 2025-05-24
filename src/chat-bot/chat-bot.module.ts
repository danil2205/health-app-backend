import { Module } from '@nestjs/common';
import { ChatBotService } from './chat-bot.service';
import { ChatBotController } from './chat-bot.controller';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './chat.entity';
import { HealthData } from 'src/health-data/entity/health-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, HealthData]), AuthModule],
  providers: [ChatBotService],
  controllers: [ChatBotController],
})
export class ChatBotModule {}
