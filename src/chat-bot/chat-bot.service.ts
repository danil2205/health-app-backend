import { streamText, StreamTextResult, ToolSet } from 'ai';
import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider,
} from '@ai-sdk/google';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendPromptDto } from './dto/send-prompt.dto';
import { HealthDataService } from '../health-data/health-data.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat, History } from './chat.entity';
import { Repository } from 'typeorm';
import { SYSTEM_INSTRUCTION } from './chat-bot.config';

@Injectable()
export class ChatBotService {
  private googleAIProvider: GoogleGenerativeAIProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly healthDataService: HealthDataService,
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
  ) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    this.googleAIProvider = createGoogleGenerativeAI({ apiKey });
  }

  async getChatHistory(
    userId: string,
    offset: number,
    limit: number,
  ): Promise<History[]> {
    const chatHistory = await this.chatRepository.findOne({
      where: { userId },
    });

    if (!chatHistory) {
      return [];
    }

    return chatHistory.history.slice(
      -(offset + limit),
      chatHistory.history.length - offset,
    );
  }

  async generateResponse(
    userId: string,
    sendPromptDto: SendPromptDto,
  ): Promise<StreamTextResult<ToolSet, never>> {
    const { query } = sendPromptDto;

    const modifiedPrompt = `
		User Health Data: ${JSON.stringify(await this.healthDataService.getHealthDataByUserId(userId))}
		User Query: ${query}

		Please provide a helpful response based on this health data. Remember to be supportive and encouraging.
		`;

    const configModel = this.configService.get('GEMINI_MODEL');
    const modelInstance = this.googleAIProvider(configModel);
    let chat = await this.chatRepository.findOne({ where: { userId } });

    if (!chat) {
      chat = this.chatRepository.create({
        userId,
        history: [],
      });
    }

    const result = streamText({
      model: modelInstance,
      system: SYSTEM_INSTRUCTION,
      prompt: modifiedPrompt,
      maxTokens: 2048,
      onFinish: async ({ text }) => {
        chat.history.push({
          query,
          response: text,
          createdAt: new Date().toISOString(),
        });
        await this.chatRepository.save(chat);
      },
    });

    return result;
  }
}
