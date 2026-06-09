import { generateObject, streamText, StreamTextResult } from 'ai';
import {
  createGoogleGenerativeAI,
  google,
  GoogleGenerativeAIProvider,
} from '@ai-sdk/google';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendPromptDto } from './dto/send-prompt.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat, History } from './chat.entity';
import { Repository } from 'typeorm';
import { SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION_DB } from './chat-bot.config';
import { z } from 'zod';
import { HealthDataPoint } from 'src/health-data/health-data-point.entity';

@Injectable()
export class ChatBotService {
  private model: string;
  private googleAIProvider: GoogleGenerativeAIProvider;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(HealthDataPoint)
    private readonly healthDataPointRepository: Repository<HealthDataPoint>,
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
  ) {
    const apiKey = this.configService.get('GOOGLE_GENERATIVE_AI_API_KEY');
    this.googleAIProvider = createGoogleGenerativeAI({ apiKey });
    this.model = this.configService.get('GEMINI_MODEL') || 'gemini-1.5-flash';
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
  ): Promise<StreamTextResult<any, any>> {
    const { query, timezone } = sendPromptDto;

    const modelInstance = this.googleAIProvider(this.model);
    let chat = await this.chatRepository.findOne({ where: { userId } });

    if (!chat) {
      chat = this.chatRepository.create({
        userId,
        history: [],
      });
    }

    const generatedQuery = await this.generateQuery(query, this.model);
    console.log('Generated SQL Query:', generatedQuery);
    const injectedQuery = this.injectUserIdFilter(generatedQuery, userId);
    console.log('Injected SQL Query:', injectedQuery);
    const resultsFromDb = await this.runGenerateSQLQuery(injectedQuery);
    console.log('Results from DB:', resultsFromDb);

    const result = streamText({
      model: modelInstance,
      system: SYSTEM_INSTRUCTION,
      prompt:
        query +
        `\n Health Data: ${JSON.stringify(resultsFromDb)}\nUser's local timezone: ${timezone}`,
      maxOutputTokens: 2048,
      onFinish: async (res) => {
        chat.history.push({
          query,
          response: res.text,
          createdAt: new Date().toISOString(),
        });
        await this.chatRepository.save(chat);
      },
    });

    return result;
  }

  generateQuery = async (input: string, model: string) => {
    try {
      const result = await generateObject({
        model: google(model),
        system: SYSTEM_INSTRUCTION_DB,
        prompt: `Generate a PostgreSQL query which starts with SELECT to retrieve the data the user wants from the "health_data_points" table. The user's request is: ${input}`,
        schema: z.object({
          query: z
            .string()
            .describe(
              "The SQL query to retrieve the data. Ensure it's valid PostgreSQL and targets the health_data_points table. JSONB columns like 'sleep_info' should be queried using the '->>' operator. Remember that 'record_time' is a timestamp with time zone and can be used directly in date operations.",
            ),
        }),
      });
      return result.object.query;
    } catch (e) {
      console.error('Error generating query:', e);
      throw new Error(
        'Failed to generate SQL query due to an internal error. Please try a different question or check the application logs.',
      );
    }
  };

  runGenerateSQLQuery = async (query: string) => {
    const sanitizedQuery = query.trim().toLowerCase();

    if (
      (!sanitizedQuery.startsWith('select') &&
        !sanitizedQuery.startsWith('with')) ||
      sanitizedQuery.includes('drop') ||
      sanitizedQuery.includes('delete') ||
      sanitizedQuery.includes('insert') ||
      sanitizedQuery.includes('update') ||
      sanitizedQuery.includes('alter') ||
      sanitizedQuery.includes('truncate') ||
      sanitizedQuery.includes('create') ||
      sanitizedQuery.includes('grant') ||
      sanitizedQuery.includes('revoke')
    ) {
      throw new Error('Only SELECT queries are allowed');
    }

    let data: any;
    try {
      data = await this.healthDataPointRepository.query(query);
    } catch (e: any) {
      if (e.message.includes('relation "unicorns" does not exist')) {
        console.log(
          'Table does not exist, creating and seeding it with dummy data now...',
        );
        throw Error('Table does not exist');
      } else {
        throw e;
      }
    }

    return data;
  };

  private injectUserIdFilter(query: string, userId: string): string {
    return query.replace(
      /user_id\s*=\s*'specific_user_id'/i,
      `user_id = '${userId}'`,
    );
  }
}
