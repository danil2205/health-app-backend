import { generateObject, generateText, tool } from 'ai';
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
import { HealthDataPoint } from 'src/health-data/entity/health-data.entity';

@Injectable()
export class ChatBotService {
  private googleAIProvider: GoogleGenerativeAIProvider;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(HealthDataPoint)
    private readonly HealthDataPointRepository: Repository<HealthDataPoint>,
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
  ) {
    const apiKey = this.configService.get('GOOGLE_GENERATIVE_AI_API_KEY');
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
  ): Promise<string> {
    const { query } = sendPromptDto;

    const configModel = this.configService.get('GEMINI_MODEL');
    const modelInstance = this.googleAIProvider(configModel);
    let chat = await this.chatRepository.findOne({ where: { userId } });

    if (!chat) {
      chat = this.chatRepository.create({
        userId,
        history: [],
      });
    }

    const generatedQuery = await this.generateQuery(
      query + `\n user_id: ${userId}`,
    );
    console.log('Generated SQL Query:', generatedQuery);
    const resultsFromDb = await this.runGenerateSQLQuery(generatedQuery);
    // console.log('Results from DB:', resultsFromDb);

    const result = await generateText({
      model: modelInstance,
      system: SYSTEM_INSTRUCTION,
      prompt: query + `\n Health Data: ${JSON.stringify(resultsFromDb)}`,
      tools: {
        getChart: tool({
          description: 'Show a chart based on the user health data',
          parameters: z.object({}),
          execute: async () => {
            const metricType = Object.keys(resultsFromDb[0]).find(
              (key) => key != 'recordTime',
            );
            const data = resultsFromDb.map((item) => ({
              recordTime: item.recordTime,
              value: metricType ? item[metricType] : undefined,
            }));
            return JSON.stringify({ data, metricType });
          },
        }),
      },
      maxTokens: 2048,
    });

    const finalResult = result.toolResults.at(-1)?.result ?? result.text;

    chat.history.push({
      query,
      response: finalResult,
      createdAt: new Date().toISOString(),
    });
    await this.chatRepository.save(chat);

    return finalResult;
  }

  generateQuery = async (input: string) => {
    'use server';
    try {
      const result = await generateObject({
        model: google('gemini-2.5-flash-preview-04-17'),
        system: SYSTEM_INSTRUCTION_DB,
        prompt: `Generate a PostgreSQL query to retrieve the data the user wants from the "health_data2" table. The user's request is: ${input}`,
        schema: z.object({
          query: z
            .string()
            .describe(
              "The SQL query to retrieve the data. Ensure it's valid PostgreSQL and targets the health_data2 table, unnesting the 'data' JSONB array with jsonb_array_elements when accessing time-series data points. Always cast JSONB numeric fields to appropriate SQL numeric types (e.g., ::integer, ::numeric, ::float). Cast recordTime to ::timestamp for date operations.",
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
    'use server';
    if (
      !query.trim().toLowerCase().startsWith('select') ||
      query.trim().toLowerCase().includes('drop') ||
      query.trim().toLowerCase().includes('delete') ||
      query.trim().toLowerCase().includes('insert') ||
      query.trim().toLowerCase().includes('update') ||
      query.trim().toLowerCase().includes('alter') ||
      query.trim().toLowerCase().includes('truncate') ||
      query.trim().toLowerCase().includes('create') ||
      query.trim().toLowerCase().includes('grant') ||
      query.trim().toLowerCase().includes('revoke')
    ) {
      throw new Error('Only SELECT queries are allowed');
    }

    let data: any;
    try {
      data = await this.HealthDataPointRepository.query(query);
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
}
