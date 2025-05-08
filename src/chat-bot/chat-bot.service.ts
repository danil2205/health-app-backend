import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendPromptDto } from './dto/send-prompt.dto';
import { HealthDataService } from '../health-data/health-data.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat, History } from './chat.entity';
import { Repository } from 'typeorm';
import { GENERATION_CONFIG, SAFETY_SETTINGS, SYSTEM_INSTRUCTION } from './chat-bot.config';

@Injectable()
export class ChatBotService {
  private googleGenerativeAI: GoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly healthDataService: HealthDataService,
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
  ) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    this.googleGenerativeAI = new GoogleGenerativeAI(apiKey);
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

		return chatHistory.history.reverse().slice(offset, offset + limit);
	}

  async generateResponse(
    userId: string,
    sendPromptDto: SendPromptDto,
  ): Promise<{ response: string }> {
    const { query } = sendPromptDto;

    const modifiedPrompt = `
		User Health Data: ${JSON.stringify(await this.healthDataService.getHealthDataByUserId(userId))}
		User Query: ${query}

		Please provide a helpful response based on this health data. Remember to be supportive and encouraging.
		`;

    const configModel = this.configService.get('GEMINI_MODEL');

    const model = this.googleGenerativeAI.getGenerativeModel({
      model: configModel,
      generationConfig: GENERATION_CONFIG,
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    let chat = await this.chatRepository.findOne({ where: { userId } });

    if (!chat) {
      chat = this.chatRepository.create({
        userId,
        history: [],
      });
    }

    const result = await model.generateContent(modifiedPrompt);

    chat.history.push({
      query: query,
      response: result.response.text(),
      createdAt: new Date().toISOString(),
    });

    await this.chatRepository.save(chat);

    return { response: result.response.text() };
  }
}
