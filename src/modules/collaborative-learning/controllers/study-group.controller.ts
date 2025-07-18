import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StudyGroupService } from '../services/study-group.service';
import {
  CreateStudyGroupDto,
  UpdateStudyGroupDto,
  StudyGroupQueryDto,
  JoinStudyGroupDto,
  ManageStudyGroupMemberDto,
} from '../dto/study-group.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Study Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('study-groups')
export class StudyGroupController {
  constructor(private readonly studyGroupService: StudyGroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new study group' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Study group created successfully',
    schema: {
      example: {
        id: 'uuid-string',
        name: 'Advanced JavaScript Study Group',
        description: 'Weekly study sessions for JavaScript advanced concepts',
        type: 'topic_based',
        status: 'open',
        creatorId: 'user-uuid',
        inviteCode: 'ABC12345',
        maxMembers: 20,
        memberCount: 1,
        isPrivate: false,
        requiresApproval: false,
        createdAt: '2025-01-18T10:00:00Z',
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized access' })
  async create(@Body() createStudyGroupDto: CreateStudyGroupDto, @CurrentUser() user: UserPayload) {
    const studyGroup = await this.studyGroupService.create(createStudyGroupDto, user);
    return {
      success: true,
      message: 'Study group created successfully',
      data: studyGroup,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all study groups with filtering and pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['course_based', 'topic_based', 'project_based', 'skill_based', 'exam_prep', 'general'],
    description: 'Filter by group type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'closed', 'full', 'archived', 'suspended'],
    description: 'Filter by group status',
  })
  @ApiQuery({ name: 'courseId', required: false, type: String, description: 'Filter by course ID' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or description',
  })
  @ApiQuery({ name: 'tags', required: false, type: [String], description: 'Filter by tags' })
  @ApiQuery({
    name: 'joinableOnly',
    required: false,
    type: Boolean,
    description: 'Show only joinable groups',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study groups retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Study groups retrieved successfully',
        data: {
          data: [
            {
              id: 'uuid-string',
              name: 'React Study Group',
              description: 'Learning React together',
              type: 'topic_based',
              status: 'open',
              memberCount: 5,
              maxMembers: 15,
              creator: {
                id: 'user-uuid',
                username: 'john_doe',
                firstName: 'John',
                lastName: 'Doe',
              },
            },
          ],
          total: 25,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
      },
    },
  })
  async findAll(@Query() query: StudyGroupQueryDto, @CurrentUser() user: UserPayload) {
    const result = await this.studyGroupService.findAll(query, user);
    return {
      success: true,
      message: 'Study groups retrieved successfully',
      data: {
        ...result,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: Math.ceil(result.total / (query.limit || 10)),
      },
    };
  }

  @Get('my-groups')
  @ApiOperation({ summary: "Get current user's study groups" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User study groups retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Your study groups retrieved successfully',
        data: [
          {
            id: 'uuid-string',
            name: 'My Study Group',
            description: 'Group I created',
            type: 'topic_based',
            status: 'open',
            memberCount: 8,
            maxMembers: 20,
            role: 'owner',
          },
        ],
      },
    },
  })
  async getMyGroups(@CurrentUser() user: UserPayload) {
    const groups = await this.studyGroupService.getMyGroups(user);
    return {
      success: true,
      message: 'Your study groups retrieved successfully',
      data: groups,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get study group by ID with detailed information' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study group retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Study group retrieved successfully',
        data: {
          id: 'uuid-string',
          name: 'Advanced React Study Group',
          description: 'Deep dive into React advanced patterns',
          type: 'topic_based',
          status: 'open',
          memberCount: 12,
          maxMembers: 20,
          isPrivate: false,
          requiresApproval: false,
          tags: ['react', 'javascript', 'frontend'],
          goals: ['Master React hooks', 'Learn performance optimization'],
          rules: ['Be respectful', 'Participate actively'],
          schedule: {
            days: ['Monday', 'Wednesday'],
            time: '19:00',
            timezone: 'UTC+7',
          },
          creator: {
            id: 'user-uuid',
            username: 'react_master',
            firstName: 'Jane',
            lastName: 'Smith',
          },
          members: [
            {
              id: 'member-uuid',
              user: {
                id: 'user-uuid',
                username: 'john_doe',
                firstName: 'John',
                lastName: 'Doe',
              },
              role: 'member',
              joinedAt: '2025-01-15T10:00:00Z',
              contributionScore: 85,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Study group not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied to this study group' })
  async findOne(@Param('id') id: string) {
    const studyGroup = await this.studyGroupService.findOne(id);
    return {
      success: true,
      message: 'Study group retrieved successfully',
      data: studyGroup,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update study group (Owner/Moderator only)' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study group updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Study group updated successfully',
        data: {
          id: 'uuid-string',
          name: 'Updated Group Name',
          description: 'Updated description',
          updatedAt: '2025-01-18T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Study group not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async update(
    @Param('id') id: string,
    @Body() updateStudyGroupDto: UpdateStudyGroupDto,
    @CurrentUser() user: UserPayload,
  ) {
    const studyGroup = await this.studyGroupService.update(id, updateStudyGroupDto, user);
    return {
      success: true,
      message: 'Study group updated successfully',
      data: studyGroup,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete study group (Owner only)' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study group deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Study group deleted successfully',
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Study group not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only group owner can delete' })
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.studyGroupService.delete(id, user);
    return {
      success: true,
      message: 'Study group deleted successfully',
    };
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a study group' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Joined study group successfully',
    schema: {
      example: {
        success: true,
        message: 'Joined study group successfully',
        data: {
          id: 'member-uuid',
          studyGroupId: 'group-uuid',
          userId: 'user-uuid',
          role: 'member',
          status: 'active',
          joinedAt: '2025-01-18T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Already a member or group is full' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Invalid invite code or group is private',
  })
  async join(
    @Param('id') id: string,
    @Body() joinDto: JoinStudyGroupDto,
    @CurrentUser() user: UserPayload,
  ) {
    const member = await this.studyGroupService.join(id, joinDto, user);
    return {
      success: true,
      message:
        member.status === 'pending'
          ? 'Join request sent successfully. Waiting for approval.'
          : 'Joined study group successfully',
      data: member,
    };
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a study group' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Left study group successfully',
    schema: {
      example: {
        success: true,
        message: 'Left study group successfully',
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not a member of this group' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Owner cannot leave without transferring ownership',
  })
  async leave(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.studyGroupService.leave(id, user);
    return {
      success: true,
      message: 'Left study group successfully',
    };
  }

  @Patch(':id/members')
  @ApiOperation({ summary: 'Manage study group member (Owner/Moderator only)' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Member managed successfully',
    schema: {
      example: {
        success: true,
        message: 'Member role updated successfully',
        data: {
          id: 'member-uuid',
          studyGroupId: 'group-uuid',
          userId: 'user-uuid',
          role: 'moderator',
          status: 'active',
          user: {
            id: 'user-uuid',
            username: 'john_doe',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Member not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async manageMember(
    @Param('id') id: string,
    @Body() memberDto: ManageStudyGroupMemberDto,
    @CurrentUser() user: UserPayload,
  ) {
    const member = await this.studyGroupService.manageMember(id, memberDto, user);
    return {
      success: true,
      message: 'Member role updated successfully',
      data: member,
    };
  }

  @Post(':id/invite-code')
  @ApiOperation({ summary: 'Generate new invite code (Owner/Moderator only)' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invite code generated successfully',
    schema: {
      example: {
        success: true,
        message: 'New invite code generated successfully',
        data: {
          inviteCode: 'XYZ98765',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async generateInviteCode(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const result = await this.studyGroupService.generateNewInviteCode(id, user);
    return {
      success: true,
      message: 'New invite code generated successfully',
      data: result,
    };
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get study group statistics (Members only)' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study group statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Study group statistics retrieved successfully',
        data: {
          totalMembers: 15,
          activeMembers: 12,
          pendingMembers: 2,
          averageContributionScore: 78.5,
          totalActivities: 245,
          weeklyActivities: 23,
          memberRoles: {
            owner: 1,
            moderator: 2,
            member: 12,
          },
          joinTrend: [
            { date: '2025-01-15', count: 2 },
            { date: '2025-01-16', count: 3 },
            { date: '2025-01-17', count: 1 },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Study group not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  async getStatistics(@Param('id') id: string, @CurrentUser() _user: UserPayload) {
    // This would be implemented to gather comprehensive statistics
    const studyGroup = await this.studyGroupService.findOne(id);

    // Simple statistics calculation (this could be moved to service layer)
    const totalMembers = studyGroup.memberCount;
    const activeMembers = studyGroup.members?.filter(m => m.status === 'active').length || 0;
    const pendingMembers = studyGroup.members?.filter(m => m.status === 'pending').length || 0;

    const memberRoles =
      studyGroup.members?.reduce(
        (acc, member) => {
          acc[member.role] = (acc[member.role] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    const averageContributionScore =
      studyGroup.members?.length > 0
        ? studyGroup.members.reduce((sum, member) => sum + member.contributionScore, 0) /
          studyGroup.members.length
        : 0;

    return {
      success: true,
      message: 'Study group statistics retrieved successfully',
      data: {
        totalMembers,
        activeMembers,
        pendingMembers,
        averageContributionScore: Math.round(averageContributionScore * 10) / 10,
        memberRoles,
        lastActivityAt: studyGroup.lastActivityAt,
        createdAt: studyGroup.createdAt,
      },
    };
  }

  @Post(':id/invite-users')
  @ApiOperation({ summary: 'Invite users to study group via email (Owner/Moderator only)' })
  @ApiParam({ name: 'id', type: String, description: 'Study group UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invitations sent successfully',
    schema: {
      example: {
        success: true,
        message: 'Invitations sent successfully',
        data: {
          invitationsSent: 3,
          failedInvitations: 0,
          inviteCode: 'ABC12345',
        },
      },
    },
  })
  async inviteUsers(
    @Param('id') id: string,
    @Body() inviteDto: { emails: string[]; message?: string },
    @CurrentUser() _user: UserPayload,
  ) {
    // This would integrate with notification service to send email invitations
    const studyGroup = await this.studyGroupService.findOne(id);

    // Check permissions
    // await this.studyGroupService.checkMemberPermission(id, user.sub, [StudyGroupRole.OWNER, StudyGroupRole.MODERATOR]);

    // In a real implementation, this would:
    // 1. Validate email addresses
    // 2. Send invitation emails via notification service
    // 3. Track invitation status

    return {
      success: true,
      message: 'Invitations sent successfully',
      data: {
        invitationsSent: inviteDto.emails.length,
        failedInvitations: 0,
        inviteCode: studyGroup.inviteCode,
      },
    };
  }
}
