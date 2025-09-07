import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from '../entities/chat-room.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { ChatRoomService } from '../services/chat-room.service';
import { WinstonService } from '@/logger/winston.service';
import { ChatRoomType, ChatRoomStatus, ParticipantRole } from '@/common/enums/communication.enums';
import { Course } from '@/modules/course/entities/course.entity';
import { User } from '@/modules/user/entities/user.entity';

interface CourseEnrollmentEvent {
  courseId: string;
  studentId: string;
  enrollmentId: string;
  enrolledAt: Date;
}

interface StudyGroupCreatedEvent {
  studyGroupId: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  courseId?: string;
}

@Injectable()
export class CourseEnrollmentListener {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly chatRoomService: ChatRoomService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CourseEnrollmentListener.name);
  }

  @OnEvent('course.enrollment.completed')
  async handleCourseEnrollment(payload: CourseEnrollmentEvent) {
    this.logger.log(`Processing course enrollment: ${payload.studentId} enrolled in ${payload.courseId}`);

    try {
      // Find or create course chat room
      let courseRoom = await this.chatRoomRepository.findOne({
        where: { 
          courseId: payload.courseId,
          roomType: ChatRoomType.COURSE 
        },
        relations: ['course']
      });

      if (!courseRoom) {
        // Create new course chat room
        const course = await this.courseRepository.findOne({
          where: { id: payload.courseId },
          relations: ['teacher']
        });

        if (!course) {
          this.logger.error(`Course not found: ${payload.courseId}`);
          return;
        }

        courseRoom = await this.chatRoomService.createRoom({
          name: `💬 ${course.title}`,
          description: `Thảo luận chung về khóa học: ${course.title}`,
          type: 'course',
          courseId: payload.courseId,
          isPrivate: false,
          maxParticipants: 500,
          createdBy: course.teacher.id,
          settings: {
            allowFileSharing: true,
            allowVoiceMessages: true,
            allowVideoMessages: false,
            messageRetentionDays: 365,
            moderationEnabled: true,
            autoTranslateEnabled: false,
            readReceiptsEnabled: true,
            typingIndicatorsEnabled: true,
            pinnedMessagesLimit: 10,
            allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif'],
            maxFileSize: 50
          },
          moderationSettings: {
            autoModeration: true,
            bannedWords: [],
            spamDetection: true,
            linkFiltering: false,
            imageModeration: false,
            profanityFilter: true,
            moderatorIds: [course.teacher.id]
          }
        });

        this.logger.log(`Created course chat room: ${courseRoom.id} for course: ${course.title}`);
      }

      // Add student to course chat room
      const existingParticipant = await this.participantRepository.findOne({
        where: {
          roomId: courseRoom.id,
          userId: payload.studentId
        }
      });

      if (!existingParticipant) {
        await this.chatRoomService.joinRoom(
          courseRoom.id,
          payload.studentId,
          ParticipantRole.MEMBER
        );

        this.logger.log(`Added student ${payload.studentId} to course chat room ${courseRoom.id}`);
      }

    } catch (error) {
      this.logger.error(`Error handling course enrollment event:`, error);
    }
  }

  @OnEvent('course.unenrollment')
  async handleCourseUnenrollment(payload: { courseId: string; studentId: string }) {
    this.logger.log(`Processing course unenrollment: ${payload.studentId} from ${payload.courseId}`);

    try {
      // Remove student from course chat room
      const courseRoom = await this.chatRoomRepository.findOne({
        where: { 
          courseId: payload.courseId,
          roomType: ChatRoomType.COURSE 
        }
      });

      if (courseRoom) {
        await this.chatRoomService.leaveRoom(courseRoom.id, payload.studentId);
        this.logger.log(`Removed student ${payload.studentId} from course chat room ${courseRoom.id}`);
      }

    } catch (error) {
      this.logger.error(`Error handling course unenrollment event:`, error);
    }
  }

  @OnEvent('study_group.created')
  async handleStudyGroupCreated(payload: StudyGroupCreatedEvent) {
    this.logger.log(`Creating chat room for study group: ${payload.studyGroupId}`);

    try {
      // Create study group chat room
      const studyGroupRoom = await this.chatRoomService.createRoom({
        name: `📚 ${payload.name}`,
        description: `Nhóm học tập: ${payload.name}`,
        type: 'study_group',
        courseId: payload.courseId,
        isPrivate: true,
        maxParticipants: 20,
        createdBy: payload.creatorId,
        settings: {
          allowFileSharing: true,
          allowVoiceMessages: true,
          allowVideoMessages: true,
          messageRetentionDays: 180,
          moderationEnabled: false,
          autoTranslateEnabled: false,
          readReceiptsEnabled: true,
          typingIndicatorsEnabled: true,
          pinnedMessagesLimit: 5,
          allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif', 'mp4', 'mp3'],
          maxFileSize: 100
        }
      });

      // Add all members to the chat room
      for (const memberId of payload.memberIds) {
        const role = memberId === payload.creatorId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER;
        await this.chatRoomService.joinRoom(studyGroupRoom.id, memberId, role);
      }

      this.logger.log(`Created study group chat room: ${studyGroupRoom.id} with ${payload.memberIds.length} members`);

    } catch (error) {
      this.logger.error(`Error creating study group chat room:`, error);
    }
  }
}