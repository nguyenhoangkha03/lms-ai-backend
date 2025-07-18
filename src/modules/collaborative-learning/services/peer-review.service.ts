import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PeerReview } from '../entities/peer-review.entity';
import { PeerReviewSubmission } from '../entities/peer-review-submission.entity';
import { PeerReviewFeedback } from '../entities/peer-review-feedback.entity';
import {
  CreatePeerReviewDto,
  UpdatePeerReviewDto,
  SubmitPeerReviewDto,
  SubmitPeerFeedbackDto,
  PeerReviewQueryDto,
} from '../dto/peer-review.dto';
import { PeerReviewStatus } from '@/common/enums/collaborative.enums';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@Injectable()
export class PeerReviewService {
  constructor(
    @InjectRepository(PeerReview)
    private readonly peerReviewRepository: Repository<PeerReview>,
    @InjectRepository(PeerReviewSubmission)
    private readonly submissionRepository: Repository<PeerReviewSubmission>,
    @InjectRepository(PeerReviewFeedback)
    private readonly feedbackRepository: Repository<PeerReviewFeedback>,
  ) {}

  async create(createDto: CreatePeerReviewDto, user: UserPayload): Promise<PeerReview> {
    const peerReview = this.peerReviewRepository.create({
      ...createDto,
      creatorId: user.sub,
      criteria: createDto.criteria ? JSON.stringify(createDto.criteria) : null,
      rubric: createDto.rubric ? JSON.stringify(createDto.rubric) : null,
    } as PeerReview);

    return this.peerReviewRepository.save(peerReview);
  }

  async findAll(
    query: PeerReviewQueryDto,
    user: UserPayload,
  ): Promise<{ data: PeerReview[]; total: number }> {
    const { page = 1, limit = 10, type, status, courseId, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.peerReviewRepository
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.creator', 'creator')
      .leftJoinAndSelect('pr.course', 'course')
      .leftJoinAndSelect('pr.assignment', 'assignment');

    // Filter by user's accessible peer reviews
    queryBuilder.andWhere(
      '(pr.creatorId = :userId OR pr.courseId IN (SELECT e.courseId FROM enrollments e WHERE e.studentId = :userId AND e.status = :enrollmentStatus))',
      { userId: user.sub, enrollmentStatus: 'active' },
    );

    if (type) {
      queryBuilder.andWhere('pr.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('pr.status = :status', { status });
    }

    if (courseId) {
      queryBuilder.andWhere('pr.courseId = :courseId', { courseId });
    }

    if (search) {
      queryBuilder.andWhere('(pr.title LIKE :search OR pr.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    queryBuilder.skip(skip).take(limit).orderBy('pr.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    // Parse JSON fields
    data.forEach(review => {
      if (review.criteria) review.criteria = JSON.parse(review.criteria);
      if (review.rubric) review.rubric = JSON.parse(review.rubric);
    });

    return { data, total };
  }

  async findOne(id: string, user: UserPayload): Promise<PeerReview> {
    const peerReview = await this.peerReviewRepository.findOne({
      where: { id },
      relations: ['creator', 'course', 'assignment', 'submissions', 'submissions.submitter'],
    });

    if (!peerReview) {
      throw new NotFoundException('Peer review not found');
    }

    // Check access permissions
    await this.checkPeerReviewAccess(peerReview, user.sub);

    // Parse JSON fields
    if (peerReview.criteria) peerReview.criteria = JSON.parse(peerReview.criteria);
    if (peerReview.rubric) peerReview.rubric = JSON.parse(peerReview.rubric);

    return peerReview;
  }

  async update(id: string, updateDto: UpdatePeerReviewDto, user: UserPayload): Promise<PeerReview> {
    const peerReview = await this.findOne(id, user);

    // Only creator can update
    if (peerReview.creatorId !== user.sub) {
      throw new ForbiddenException('Only the creator can update this peer review');
    }

    const updateData = {
      ...updateDto,
      criteria: updateDto.criteria ? JSON.stringify(updateDto.criteria) : peerReview.criteria,
      rubric: updateDto.rubric ? JSON.stringify(updateDto.rubric) : peerReview.rubric,
      updatedBy: user.sub,
    };

    await this.peerReviewRepository.update(id, updateData);
    return this.findOne(id, user);
  }

  async delete(id: string, user: UserPayload): Promise<void> {
    const peerReview = await this.findOne(id, user);

    // Only creator can delete
    if (peerReview.creatorId !== user.sub) {
      throw new ForbiddenException('Only the creator can delete this peer review');
    }

    await this.peerReviewRepository.softDelete(id);
  }

  async submitWork(
    id: string,
    submitDto: SubmitPeerReviewDto,
    user: UserPayload,
  ): Promise<PeerReviewSubmission> {
    const peerReview = await this.findOne(id, user);

    // Check if user already submitted
    const existingSubmission = await this.submissionRepository.findOne({
      where: { peerReviewId: id, submitterId: user.sub },
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already submitted for this peer review');
    }

    // Check deadline
    if (peerReview.dueDate && new Date() > peerReview.dueDate) {
      throw new BadRequestException('Submission deadline has passed');
    }

    const submission = this.submissionRepository.create({
      peerReviewId: id,
      submitterId: user.sub,
      content: submitDto.content,
      attachments: submitDto.attachments ? JSON.stringify(submitDto.attachments) : null,
      status: 'submitted',
      submittedAt: new Date(),
    } as PeerReviewSubmission);

    return this.submissionRepository.save(submission);
  }

  async generateAssignments(id: string, user: UserPayload): Promise<void> {
    const peerReview = await this.findOne(id, user);

    // Only creator can generate assignments
    if (peerReview.creatorId !== user.sub) {
      throw new ForbiddenException('Only the creator can generate assignments');
    }

    const submissions = await this.submissionRepository.find({
      where: { peerReviewId: id, status: 'submitted' },
    });

    if (submissions.length < 2) {
      throw new BadRequestException('Need at least 2 submissions to generate assignments');
    }

    // Simple round-robin assignment algorithm
    const assignments = this.generatePeerAssignments(
      submissions,
      peerReview.reviewersPerSubmission,
      peerReview.submissionsPerReviewer,
    );

    // Create feedback entries for assignments
    for (const assignment of assignments) {
      const feedback = this.feedbackRepository.create({
        submissionId: assignment.submissionId,
        reviewerId: assignment.reviewerId,
        status: 'draft',
      });
      await this.feedbackRepository.save(feedback);
    }

    // Update peer review status
    await this.peerReviewRepository.update(id, {
      status: PeerReviewStatus.IN_PROGRESS,
      updatedBy: user.sub,
    });
  }

  async getMyAssignments(id: string, user: UserPayload): Promise<any[]> {
    const assignments = await this.feedbackRepository.find({
      where: {
        submission: { peerReviewId: id },
        reviewerId: user.sub,
      },
      relations: ['submission', 'submission.submitter'],
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      submissionId: assignment.submissionId,
      submitter: assignment.submission.submitter,
      content: assignment.submission.content,
      status: assignment.status,
      isAnonymous: assignment.submission.peerReview?.isAnonymous || false,
    }));
  }

  async submitFeedback(
    submissionId: string,
    feedbackDto: SubmitPeerFeedbackDto,
    user: UserPayload,
  ): Promise<PeerReviewFeedback | null> {
    const feedback = await this.feedbackRepository.findOne({
      where: { submissionId, reviewerId: user.sub },
      relations: ['submission'],
    });

    if (!feedback) {
      throw new NotFoundException('Feedback assignment not found');
    }

    const updateData = {
      feedback: feedbackDto.feedback,
      score: feedbackDto.score,
      criteriaScores: feedbackDto.criteriaScores
        ? JSON.stringify(feedbackDto.criteriaScores)
        : null,
      status: 'submitted',
      submittedAt: new Date(),
    } as PeerReviewFeedback;

    await this.feedbackRepository.update(feedback.id, updateData);

    // Update submission review count
    await this.submissionRepository.increment({ id: submissionId }, 'reviewsReceived', 1);

    return this.feedbackRepository.findOne({
      where: { id: feedback.id },
      relations: ['reviewer'],
    });
  }

  async getSubmissionFeedbacks(
    submissionId: string,
    user: UserPayload,
  ): Promise<PeerReviewFeedback[]> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['peerReview'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Only submitter or creator can view feedbacks
    if (submission.submitterId !== user.sub && submission.peerReview.creatorId !== user.sub) {
      throw new ForbiddenException('Access denied to view feedbacks');
    }

    const feedbacks = await this.feedbackRepository.find({
      where: { submissionId, status: 'submitted' },
      relations: ['reviewer'],
    });

    // Parse JSON fields and hide reviewer info if anonymous
    return feedbacks.map(feedback => {
      if (feedback.criteriaScores) {
        feedback.criteriaScores = JSON.parse(feedback.criteriaScores);
      }

      if (submission.peerReview.isAnonymous && submission.submitterId === user.sub) {
        delete feedback.reviewer;
        feedback.reviewerId = null;
      }

      return feedback;
    });
  }

  private async checkPeerReviewAccess(peerReview: PeerReview, userId: string): Promise<boolean> {
    // Creator always has access
    if (peerReview.creatorId === userId) {
      return true;
    }

    // Check if user is enrolled in the course
    if (peerReview.courseId) {
      // Would check enrollment here
      return true; // Simplified for now
    }

    throw new ForbiddenException('Access denied to this peer review');
  }

  private generatePeerAssignments(
    submissions: PeerReviewSubmission[],
    reviewersPerSubmission: number,
    _submissionsPerReviewer: number,
  ): Array<{ submissionId: string; reviewerId: string }> {
    const assignments: Array<{ submissionId: string; reviewerId: string }> = [];
    const submitterIds = submissions.map(s => s.submitterId);

    for (const submission of submissions) {
      const otherSubmitters = submitterIds.filter(id => id !== submission.submitterId);

      // Randomly assign reviewers
      const shuffled = otherSubmitters.sort(() => 0.5 - Math.random());
      const reviewers = shuffled.slice(0, Math.min(reviewersPerSubmission, otherSubmitters.length));

      for (const reviewerId of reviewers) {
        assignments.push({
          submissionId: submission.id,
          reviewerId,
        });
      }
    }

    return assignments;
  }
}
