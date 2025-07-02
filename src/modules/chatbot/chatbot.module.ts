import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotConversation } from './entities/chatbot-conversation.entity';
import { ChatbotMessage } from './entities/chatbot-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatbotConversation, ChatbotMessage])],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [TypeOrmModule],
})
export class ChatbotModule {}
