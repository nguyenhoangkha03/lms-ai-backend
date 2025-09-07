import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { ChatRoom } from '../entities/chat-room.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Enrollment } from '@/modules/course/entities/enrollment.entity';
import { StudyGroupMember } from '@/modules/collaborative-learning/entities/study-group-member.entity';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { ChatRoomType, ParticipantRole, ParticipantStatus } from '@/common/enums/communication.enums';

export interface SuggestedContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  relationshipType: 'course_mate' | 'study_group_member' | 'teacher' | 'frequent_contact';
  relationshipDetails: {
    sharedCourses?: string[];
    studyGroups?: string[];
    messageCount?: number;
    lastInteraction?: Date;
  };
  onlineStatus: 'online' | 'offline' | 'away';
  canDirectMessage: boolean;
}

export interface DirectMessagePermission {
  canMessage: boolean;
  reason?: string;
  restrictions?: string[];
  requiresApproval?: boolean;
}

@Injectable()
export class ChatContactService {
  constructor(
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(StudyGroupMember)
    private readonly studyGroupMemberRepository: Repository<StudyGroupMember>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(ChatContactService.name);
  }

  async getSuggestedContacts(userId: string, limit: number = 50): Promise<SuggestedContact[]> {
    const cacheKey = `suggested_contacts:${userId}`;

    const cached = await this.cacheService.get<SuggestedContact[]>(cacheKey);
    if (cached) {
      return cached.slice(0, limit);
    }

    try {
      this.logger.debug(`Starting getSuggestedContacts for user: ${userId}`);
      const suggestions: SuggestedContact[] = [];

      // 1. Course mates
      this.logger.debug('Getting course mates...');
      const courseMates = await this.getCourseMates(userId);
      this.logger.debug(`Found ${courseMates.length} course mates`);
      suggestions.push(...courseMates);

      // 2. Study group members
      this.logger.debug('Getting study group members...');
      const studyGroupMembers = await this.getStudyGroupMembers(userId);
      this.logger.debug(`Found ${studyGroupMembers.length} study group members`);
      suggestions.push(...studyGroupMembers);

      // 3. Teachers from enrolled courses
      this.logger.debug('Getting teachers...');
      const teachers = await this.getMyTeachers(userId);
      this.logger.debug(`Found ${teachers.length} teachers`);
      suggestions.push(...teachers);

      // 4. Frequent contacts from chat history
      this.logger.debug('Getting frequent contacts...');
      const frequentContacts = await this.getFrequentContacts(userId);
      this.logger.debug(`Found ${frequentContacts.length} frequent contacts`);
      suggestions.push(...frequentContacts);

      this.logger.debug(`Total suggestions before dedup: ${suggestions.length}`);

      // Remove duplicates and sort by relevance
      const uniqueSuggestions = this.deduplicateAndScore(suggestions);
      this.logger.debug(`Unique suggestions after dedup: ${uniqueSuggestions.length}`);

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, uniqueSuggestions, 1800);

      return uniqueSuggestions.slice(0, limit);
    } catch (error) {
      this.logger.error(`Error getting suggested contacts for user ${userId}:`, error);
      return [];
    }
  }

  async checkDirectMessagePermission(
    fromUserId: string,
    toUserId: string,
  ): Promise<DirectMessagePermission> {
    const cacheKey = `dm_permission:${fromUserId}:${toUserId}`;

    const cached = await this.cacheService.get<DirectMessagePermission>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const permission = await this.evaluateDirectMessagePermission(fromUserId, toUserId);

      // Cache for 15 minutes
      await this.cacheService.set(cacheKey, permission, 900);

      return permission;
    } catch (error) {
      this.logger.error(
        `Error checking DM permission between ${fromUserId} and ${toUserId}:`,
        error,
      );
      return { canMessage: false, reason: 'Permission check failed' };
    }
  }

  async createOrGetDirectRoom(user1Id: string, user2Id: string): Promise<ChatRoom | null> {
    // Check permission first
    const permission = await this.checkDirectMessagePermission(user1Id, user2Id);
    if (!permission.canMessage) {
      throw new Error(`Direct messaging not allowed: ${permission.reason}`);
    }

    try {
      // Look for existing direct room
      const existingRoom = await this.findExistingDirectRoom(user1Id, user2Id);
      if (existingRoom) {
        return existingRoom;
      }

      // Create new direct message room
      const [user1, user2] = await Promise.all([
        this.userRepository.findOne({ where: { id: user1Id } }),
        this.userRepository.findOne({ where: { id: user2Id } }),
      ]);

      if (!user1 || !user2) {
        throw new Error('One or both users not found');
      }

      const roomName = `${user1.firstName} ${user1.lastName}, ${user2.firstName} ${user2.lastName}`;

      const directRoom = this.chatRoomRepository.create({
        name: roomName,
        description: 'Direct message conversation',
        roomType: ChatRoomType.PRIVATE,
        isPrivate: true,
        isActive: true,
        maxParticipants: 2,
        participantCount: 2,
        createdBy: user1Id,
        settings: {
          allowFileSharing: true,
          allowVoiceMessages: true,
          allowVideoMessages: false,
          messageRetentionDays: 365,
          moderationEnabled: false,
          autoTranslateEnabled: false,
          readReceiptsEnabled: true,
          typingIndicatorsEnabled: true,
          pinnedMessagesLimit: 3,
          allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif'],
          maxFileSize: 25,
        },
      });

      const savedRoom = await this.chatRoomRepository.save(directRoom);

      // Add both participants
      await Promise.all([
        this.createParticipant(savedRoom.id, user1Id, ParticipantRole.MEMBER),
        this.createParticipant(savedRoom.id, user2Id, ParticipantRole.MEMBER),
      ]);

      this.logger.log(
        `Created direct message room ${savedRoom.id} between ${user1Id} and ${user2Id}`,
      );

      return savedRoom;
    } catch (error) {
      this.logger.error(`Error creating direct room between ${user1Id} and ${user2Id}:`, error);
      return null;
    }
  }

  private async getCourseMates(userId: string): Promise<SuggestedContact[]> {
    try {
      this.logger.log(`Getting course mates for user: ${userId}`);

      // Get user's enrolled courses
      this.logger.log('Step 1: Getting user enrollments...');
      let userEnrollments;
      try {
        userEnrollments = await this.enrollmentRepository.find({
          where: { 
            studentId: userId, 
            status: In(['enrolled', 'in_progress', 'completed', 'active']) 
          },
          select: ['courseId'],
        });
      } catch (stepError) {
        this.logger.log('Error in Step 1:', stepError);
        throw stepError;
      }

      this.logger.log(`User has ${userEnrollments.length} enrollments`);

      if (userEnrollments.length === 0) {
        this.logger.log('No enrollments found for user');
        return [];
      }

      const courseIds = userEnrollments.map(e => e.courseId);
      this.logger.log(`Step 2: Looking for course mates in courses: ${courseIds.join(', ')}`);

      // Get other enrollments in same courses (exclude current user)
      this.logger.log('Step 3: Getting other enrollments...');
      const otherEnrollments = await this.enrollmentRepository.find({
        where: {
          courseId: In(courseIds),
          status: In(['enrolled', 'in_progress', 'completed', 'active']),
        },
        select: ['studentId', 'courseId'],
      });

      this.logger.log(`Found ${otherEnrollments.length} total enrollments in these courses`);

      // Filter out current user and get unique student IDs
      this.logger.log('Step 4: Filtering out current user...');
      const otherStudentIds = [
        ...new Set(otherEnrollments.filter(e => e.studentId !== userId).map(e => e.studentId)),
      ];

      this.logger.log(
        `Found ${otherStudentIds.length} unique other students: ${otherStudentIds.slice(0, 5).join(', ')}${otherStudentIds.length > 5 ? '...' : ''}`,
      );

      if (otherStudentIds.length === 0) {
        this.logger.log('No other students found');
        return [];
      }

      // Get user details for these students
      this.logger.log('Step 5: Getting user details...');
      const courseMates = await this.userRepository.find({
        where: { id: In(otherStudentIds) },
        select: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'userType'],
        relations: ['roles'],
      });

      this.logger.log(`Found ${courseMates.length} course mates with user details`);

      return courseMates.map(mate => {
        // Find shared courses for this mate
        const sharedCourses = otherEnrollments
          .filter(e => e.studentId === mate.id)
          .map(e => e.courseId);

        return {
          id: mate.id,
          firstName: mate.firstName || 'Unknown',
          lastName: mate.lastName || 'User',
          email: mate.email,
          avatar: mate.avatarUrl,
          role: mate.userType || mate.roles?.[0]?.name || 'student',
          relationshipType: 'course_mate' as const,
          relationshipDetails: {
            sharedCourses,
          },
          onlineStatus: 'offline' as const,
          canDirectMessage: true,
        };
      });
    } catch (error) {
      this.logger.log(`Error in getCourseMates: ${error.message}`);
      return [];
    }
  }

  private async getStudyGroupMembers(userId: string): Promise<SuggestedContact[]> {
    try {
      this.logger.debug(`Getting study group members for user: ${userId}`);
      // For now, return empty array to avoid errors
      this.logger.debug('Study group members not implemented yet');
      return [];
    } catch (error) {
      this.logger.error(`Error in getStudyGroupMembers:`, error);
      return [];
    }
  }

  private async getMyTeachers(userId: string): Promise<SuggestedContact[]> {
    try {
      this.logger.log(`Getting teachers for user: ${userId}`);
      // For now, return empty array to avoid errors
      this.logger.log('Teachers not implemented yet');
      return [];
    } catch (error) {
      this.logger.error(`Error in getMyTeachers:`, error);
      return [];
    }
  }

  private async getFrequentContacts(userId: string): Promise<SuggestedContact[]> {
    try {
      this.logger.log(`Getting frequent contacts for user: ${userId}`);
      // For now, return empty array to avoid errors
      this.logger.log('Frequent contacts not implemented yet');
      return [];
    } catch (error) {
      this.logger.error(`Error in getFrequentContacts:`, error);
      return [];
    }
  }

  private deduplicateAndScore(suggestions: SuggestedContact[]): SuggestedContact[] {
    const uniqueMap = new Map<string, SuggestedContact>();

    for (const suggestion of suggestions) {
      const existing = uniqueMap.get(suggestion.id);
      if (!existing) {
        uniqueMap.set(suggestion.id, suggestion);
      } else {
        // Merge relationship details
        existing.relationshipDetails.sharedCourses = [
          ...(existing.relationshipDetails.sharedCourses || []),
          ...(suggestion.relationshipDetails.sharedCourses || []),
        ];
        existing.relationshipDetails.studyGroups = [
          ...(existing.relationshipDetails.studyGroups || []),
          ...(suggestion.relationshipDetails.studyGroups || []),
        ];
      }
    }

    // Sort by relationship strength (teachers first, then course mates, etc.)
    return Array.from(uniqueMap.values()).sort((a, b) => {
      const weights = {
        teacher: 4,
        course_mate: 3,
        study_group_member: 2,
        frequent_contact: 1,
      };
      return weights[b.relationshipType] - weights[a.relationshipType];
    });
  }

  private async evaluateDirectMessagePermission(
    fromUserId: string,
    toUserId: string,
  ): Promise<DirectMessagePermission> {
    // Check if users share any courses
    const sharedCourses = await this.checkSharedCourses(fromUserId, toUserId);
    if (sharedCourses.length > 0) {
      return { canMessage: true };
    }

    // Check if users are in same study groups
    const sharedStudyGroups = await this.checkSharedStudyGroups(fromUserId, toUserId);
    if (sharedStudyGroups.length > 0) {
      return { canMessage: true };
    }

    // Check teacher-student relationship
    const isTeacherStudent = await this.checkTeacherStudentRelationship(fromUserId, toUserId);
    if (isTeacherStudent) {
      return { canMessage: true };
    }

    // Check if they have existing chat history
    const hasExistingChat = await this.findExistingDirectRoom(fromUserId, toUserId);
    if (hasExistingChat) {
      return { canMessage: true };
    }

    return {
      canMessage: false,
      reason: 'No shared learning context found',
      restrictions: [
        'Must be enrolled in same course',
        'Must be in same study group',
        'Must have teacher-student relationship',
      ],
    };
  }

  private async checkSharedCourses(userId1: string, userId2: string): Promise<string[]> {
    const result = await this.enrollmentRepository
      .createQueryBuilder('e1')
      .innerJoin('enrollments', 'e2', 'e1.courseId = e2.courseId')
      .where('e1.studentId = :userId1', { userId1 })
      .andWhere('e2.studentId = :userId2', { userId2 })
      .andWhere('e1.status IN (:...statuses1)', { statuses1: ['enrolled', 'in_progress', 'completed', 'active'] })
      .andWhere('e2.status IN (:...statuses2)', { statuses2: ['enrolled', 'in_progress', 'completed', 'active'] })
      .select('e1.courseId')
      .getRawMany();

    return result.map(r => r.courseId);
  }

  private async checkSharedStudyGroups(userId1: string, userId2: string): Promise<string[]> {
    const result = await this.studyGroupMemberRepository
      .createQueryBuilder('sgm1')
      .innerJoin('study_group_members', 'sgm2', 'sgm1.studyGroupId = sgm2.studyGroupId')
      .where('sgm1.userId = :userId1', { userId1 })
      .andWhere('sgm2.userId = :userId2', { userId2 })
      .andWhere('sgm1.isActive = true')
      .andWhere('sgm2.isActive = true')
      .select('sgm1.studyGroupId')
      .getRawMany();

    return result.map(r => r.studyGroupId);
  }

  private async checkTeacherStudentRelationship(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    // Check if userId1 is teacher and userId2 is their student
    const relationship1 = await this.enrollmentRepository
      .createQueryBuilder('e')
      .innerJoin('e.course', 'course')
      .where('course.teacherId = :teacherId', { teacherId: userId1 })
      .andWhere('e.studentId = :studentId', { studentId: userId2 })
      .andWhere('e.status IN (:...statuses)', { statuses: ['enrolled', 'in_progress', 'completed', 'active'] })
      .getCount();

    if (relationship1 > 0) return true;

    // Check opposite direction
    const relationship2 = await this.enrollmentRepository
      .createQueryBuilder('e')
      .innerJoin('e.course', 'course')
      .where('course.teacherId = :teacherId', { teacherId: userId2 })
      .andWhere('e.studentId = :studentId', { studentId: userId1 })
      .andWhere('e.status IN (:...statuses)', { statuses: ['enrolled', 'in_progress', 'completed', 'active'] })
      .getCount();

    return relationship2 > 0;
  }

  private async findExistingDirectRoom(userId1: string, userId2: string): Promise<ChatRoom | null> {
    return this.chatRoomRepository
      .createQueryBuilder('room')
      .innerJoin('room.participants', 'p1')
      .innerJoin('room.participants', 'p2')
      .where('room.roomType = :roomType', { roomType: ChatRoomType.PRIVATE })
      .andWhere('room.participantCount = 2')
      .andWhere('p1.userId = :userId1', { userId1 })
      .andWhere('p2.userId = :userId2', { userId2 })
      .andWhere('p1.status = :activeStatus1', { activeStatus1: ParticipantStatus.ACTIVE })
      .andWhere('p2.status = :activeStatus2', { activeStatus2: ParticipantStatus.ACTIVE })
      .getOne();
  }

  private async createParticipant(
    roomId: string,
    userId: string,
    role: ParticipantRole,
  ): Promise<void> {
    const participant = this.participantRepository.create({
      roomId,
      userId,
      role,
      joinedAt: new Date(),
      status: ParticipantStatus.ACTIVE,
      lastSeenAt: new Date(),
    });

    await this.participantRepository.save(participant);
  }
}
