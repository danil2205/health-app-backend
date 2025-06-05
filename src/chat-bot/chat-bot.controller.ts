import { Body, Controller, Get, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ChatBotService } from './chat-bot.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { SendPromptDto } from './dto/send-prompt.dto';
import { History } from './chat.entity';
import { Response } from 'express';

@Controller('chat')
export class ChatBotController {
  constructor(private readonly chatBotService: ChatBotService) {}

  @UseGuards(AuthGuard)
  @Get('history')
  async getChatHistory(
    @Request() req,
    @Query('offset') offset: number = 0,
    @Query('limit') limit: number = 10,
  ): Promise<History[]> {
    return this.chatBotService.getChatHistory(req.user.id, offset, limit);
  }

  @UseGuards(AuthGuard)
  @Post()
  async generateResponse(
    @Request() req,
    @Body() sendPromptDto: SendPromptDto,
    @Res() res: Response,
  ) {
    const result = await this.chatBotService.generateResponse(
      req.user.id,
      sendPromptDto,
    );
    
    result.pipeTextStreamToResponse(res);
  }
}