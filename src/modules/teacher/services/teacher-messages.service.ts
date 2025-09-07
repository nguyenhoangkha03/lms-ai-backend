import { Injectable } from '@nestjs/common';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class TeacherMessagesService {
  constructor(
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherMessagesService.name);
  }

  async getConversations(teacherId: string, limit: number, offset: number): Promise<any> {
    this.logger.log(`Getting conversations for teacher: ${teacherId}`);

    // Mock conversations data
    const mockConversations = [
      {
        id: 'conv-1',
        participants: [
          {
            id: 'student-1',
            name: 'Nguyễn Văn An',
            email: 'nguyen.van.an@email.com',
            avatar: null,
            role: 'student',
          },
        ],
        lastMessage: {
          id: 'msg-1',
          content: 'Thầy ơi, em có thể xin thêm thời gian để hoàn thành bài tập không ạ?',
          senderId: 'student-1',
          senderName: 'Nguyễn Văn An',
          sentAt: '2024-03-21T14:30:00Z',
          messageType: 'text',
        },
        unreadCount: 1,
        lastActivityAt: '2024-03-21T14:30:00Z',
        subject: 'Về bài tập Machine Learning',
        courseId: 'course-1',
        courseName: 'Machine Learning Fundamentals',
        isArchived: false,
      },
      {
        id: 'conv-2',
        participants: [
          {
            id: 'student-2',
            name: 'Trần Thị Bình',
            email: 'tran.thi.binh@email.com',
            avatar: null,
            role: 'student',
          },
        ],
        lastMessage: {
          id: 'msg-2',
          content: 'Cảm ơn thầy đã giải thích rất chi tiết!',
          senderId: 'student-2',
          senderName: 'Trần Thị Bình',
          sentAt: '2024-03-20T16:45:00Z',
          messageType: 'text',
        },
        unreadCount: 0,
        lastActivityAt: '2024-03-20T16:45:00Z',
        subject: 'Câu hỏi về Neural Networks',
        courseId: 'course-1',
        courseName: 'Machine Learning Fundamentals',
        isArchived: false,
      },
      {
        id: 'conv-3',
        participants: [
          {
            id: 'student-3',
            name: 'Lê Minh Cường',
            email: 'le.minh.cuong@email.com',
            avatar: null,
            role: 'student',
          },
        ],
        lastMessage: {
          id: 'msg-3',
          content: 'Em đã gửi file code theo yêu cầu của thầy',
          senderId: 'student-3',
          senderName: 'Lê Minh Cường',
          sentAt: '2024-03-19T10:15:00Z',
          messageType: 'file',
        },
        unreadCount: 2,
        lastActivityAt: '2024-03-19T10:15:00Z',
        subject: 'Nộp bài tập Python',
        courseId: 'course-2',
        courseName: 'Advanced Python Programming',
        isArchived: false,
      },
    ];

    return {
      conversations: mockConversations.slice(offset, offset + limit),
      totalCount: mockConversations.length,
    };
  }

  async getMessages(teacherId: string, conversationId: string, limit: number, before?: string): Promise<any> {
    this.logger.log(`Getting messages for conversation ${conversationId}, teacher: ${teacherId}`);

    // Mock messages data
    const mockMessages = [
      {
        id: 'msg-1',
        conversationId,
        content: 'Chào em! Thầy đã nhận được tin nhắn của em.',
        senderId: teacherId,
        senderName: 'Teacher',
        sentAt: '2024-03-21T15:00:00Z',
        messageType: 'text',
        isRead: true,
        readAt: '2024-03-21T15:01:00Z',
        attachments: [],
      },
      {
        id: 'msg-2',
        conversationId,
        content: 'Thầy ơi, em có thể xin thêm thời gian để hoàn thành bài tập không ạ? Em đang gặp khó khăn ở phần implement neural network.',
        senderId: 'student-1',
        senderName: 'Nguyễn Văn An',
        sentAt: '2024-03-21T14:30:00Z',
        messageType: 'text',
        isRead: false,
        attachments: [],
      },
      {
        id: 'msg-3',
        conversationId,
        content: 'Chào thầy! Em có vài câu hỏi về bài tập tuần này.',
        senderId: 'student-1',
        senderName: 'Nguyễn Văn An',
        sentAt: '2024-03-21T09:00:00Z',
        messageType: 'text',
        isRead: true,
        readAt: '2024-03-21T09:30:00Z',
        attachments: [],
      },
    ];

    return {
      messages: mockMessages.slice(0, limit),
      hasMore: mockMessages.length > limit,
    };
  }

  async createConversation(teacherId: string, conversationData: any): Promise<any> {
    this.logger.log(`Creating conversation for teacher: ${teacherId}`);

    // Mock create conversation
    return {
      id: `conv-${Date.now()}`,
      participants: conversationData.participantIds.map((id: string, index: number) => ({
        id,
        name: `Student ${index + 1}`,
        role: 'student',
      })),
      subject: conversationData.subject || 'New Conversation',
      createdAt: new Date().toISOString(),
      createdBy: teacherId,
    };
  }

  async sendMessage(teacherId: string, conversationId: string, messageData: any): Promise<any> {
    this.logger.log(`Sending message in conversation ${conversationId}, teacher: ${teacherId}`);

    // Mock send message
    return {
      id: `msg-${Date.now()}`,
      conversationId,
      content: messageData.content,
      senderId: teacherId,
      senderName: 'Teacher',
      sentAt: new Date().toISOString(),
      messageType: messageData.messageType || 'text',
      attachments: messageData.attachments || [],
      isRead: false,
    };
  }

  async markAsRead(teacherId: string, conversationId: string): Promise<void> {
    this.logger.log(`Marking conversation ${conversationId} as read for teacher: ${teacherId}`);
    // Mock mark as read - no return needed
  }

  async archiveConversation(teacherId: string, conversationId: string): Promise<void> {
    this.logger.log(`Archiving conversation ${conversationId} for teacher: ${teacherId}`);
    // Mock archive - no return needed
  }

  async sendBulkMessage(teacherId: string, bulkMessageData: any): Promise<{ sentCount: number }> {
    this.logger.log(`Sending bulk message to ${bulkMessageData.recipientIds.length} recipients, teacher: ${teacherId}`);

    // Mock bulk message
    return {
      sentCount: bulkMessageData.recipientIds.length,
    };
  }

  async getUnreadCount(teacherId: string): Promise<number> {
    this.logger.log(`Getting unread count for teacher: ${teacherId}`);

    // Mock unread count
    return 3;
  }

  async searchMessages(teacherId: string, query: string, conversationId?: string, limit?: number): Promise<any> {
    this.logger.log(`Searching messages for teacher: ${teacherId}, query: ${query}`);

    // Mock search results
    const mockResults = [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Thầy ơi, em có thể xin thêm thời gian để hoàn thành bài tập không ạ?',
        senderId: 'student-1',
        senderName: 'Nguyễn Văn An',
        sentAt: '2024-03-21T14:30:00Z',
        messageType: 'text',
        conversationSubject: 'Về bài tập Machine Learning',
      },
    ];

    return {
      results: mockResults.slice(0, limit),
      totalCount: mockResults.length,
    };
  }
}