import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendPromptDto } from './dto/send-prompt.dto';

@Injectable()
export class GeminiService {
  private googleGenerativeAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    this.googleGenerativeAI = new GoogleGenerativeAI(apiKey);
  }

	async generateResponse(sendPromptDto: SendPromptDto): Promise<{ geminiResponse: string }> {
    const { prompt } = sendPromptDto;

    const configModel = this.configService.get('GEMINI_MODEL');

    const model = this.googleGenerativeAI.getGenerativeModel({
      model: configModel,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 1,
        topK: 32,
        topP: 1,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

		const result = await model.generateContent(prompt);

    return { geminiResponse: result.response.text() };
  }
}
