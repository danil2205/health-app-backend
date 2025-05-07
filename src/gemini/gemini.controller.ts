import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { SendPromptDto } from './dto/send-prompt.dto';

@Controller('gemini')
export class GeminiController {
	constructor(private readonly geminiService: GeminiService) {}

	@UseGuards(AuthGuard)
	@Post()
	async generateResponse(@Body() sendPromptDto: SendPromptDto): Promise<{ geminiResponse: string }> {
		return this.geminiService.generateResponse(sendPromptDto);
	}
}
