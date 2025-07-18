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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PeerReviewService } from '../services/peer-review.service';
import {
  CreatePeerReviewDto,
  UpdatePeerReviewDto,
  SubmitPeerReviewDto,
  SubmitPeerFeedbackDto,
  PeerReviewQueryDto,
} from '../dto/peer-review.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Peer Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('peer-reviews')
export class PeerReviewController {
  constructor(private readonly peerReviewService: PeerReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new peer review assignment' })
  @ApiResponse({ status: 201, description: 'Peer review created successfully' })
  async create(@Body() createPeerReviewDto: CreatePeerReviewDto, @CurrentUser() user: UserPayload) {
    return this.peerReviewService.create(createPeerReviewDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all peer reviews' })
  @ApiResponse({ status: 200, description: 'Peer reviews retrieved successfully' })
  async findAll(@Query() query: PeerReviewQueryDto, @CurrentUser() user: UserPayload) {
    return this.peerReviewService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get peer review by ID' })
  @ApiResponse({ status: 200, description: 'Peer review retrieved successfully' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.peerReviewService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update peer review' })
  @ApiResponse({ status: 200, description: 'Peer review updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updatePeerReviewDto: UpdatePeerReviewDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.peerReviewService.update(id, updatePeerReviewDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete peer review' })
  @ApiResponse({ status: 200, description: 'Peer review deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.peerReviewService.delete(id, user);
    return { message: 'Peer review deleted successfully' };
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit work for peer review' })
  @ApiResponse({ status: 201, description: 'Submission created successfully' })
  async submitWork(
    @Param('id') id: string,
    @Body() submitDto: SubmitPeerReviewDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.peerReviewService.submitWork(id, submitDto, user);
  }

  @Post(':id/assignments')
  @ApiOperation({ summary: 'Generate peer review assignments' })
  @ApiResponse({ status: 201, description: 'Assignments generated successfully' })
  async generateAssignments(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.peerReviewService.generateAssignments(id, user);
    return { message: 'Peer review assignments generated successfully' };
  }

  @Get(':id/my-assignments')
  @ApiOperation({ summary: 'Get my peer review assignments' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved successfully' })
  async getMyAssignments(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.peerReviewService.getMyAssignments(id, user);
  }

  @Post('submissions/:submissionId/feedback')
  @ApiOperation({ summary: 'Submit peer feedback' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  async submitFeedback(
    @Param('submissionId') submissionId: string,
    @Body() feedbackDto: SubmitPeerFeedbackDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.peerReviewService.submitFeedback(submissionId, feedbackDto, user);
  }

  @Get('submissions/:submissionId/feedbacks')
  @ApiOperation({ summary: 'Get submission feedbacks' })
  @ApiResponse({ status: 200, description: 'Feedbacks retrieved successfully' })
  async getSubmissionFeedbacks(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.peerReviewService.getSubmissionFeedbacks(submissionId, user);
  }
}
