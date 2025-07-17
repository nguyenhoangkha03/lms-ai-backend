import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPostVote } from '../entities/forum-post-vote.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { CreateForumVoteDto } from '../dto/forum-vote.dto';
import { ForumReputationService } from './forum-reputation.service';
import { ForumThreadService } from './forum-thread.service';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';
import { ForumVoteType } from '@/common/enums/forum.enums';

@Injectable()
export class ForumVoteService {
  constructor(
    @InjectRepository(ForumPostVote)
    private readonly voteRepository: Repository<ForumPostVote>,
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    private readonly reputationService: ForumReputationService,
    private readonly threadService: ForumThreadService,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {}

  async vote(postId: string, userId: string, voteDto: CreateForumVoteDto): Promise<ForumPostVote> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['author', 'thread'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user is voting on their own post
      if (post.authorId === userId) {
        throw new BadRequestException('Cannot vote on your own post');
      }

      // Check if user already voted
      const existingVote = await this.voteRepository.findOne({
        where: { postId, userId },
      });

      let vote: ForumPostVote;
      let voteValueDelta = 0;
      let reputationDelta = 0;

      if (existingVote) {
        // Update existing vote
        const oldValue = existingVote.value;
        existingVote.voteType = voteDto.voteType;
        existingVote.value = this.getVoteValue(voteDto.voteType);
        existingVote.metadata = voteDto.metadata;
        existingVote.updatedBy = userId;

        vote = await this.voteRepository.save(existingVote);
        voteValueDelta = vote.value - oldValue;
      } else {
        // Create new vote
        vote = this.voteRepository.create({
          postId,
          userId,
          voteType: voteDto.voteType,
          value: this.getVoteValue(voteDto.voteType),
          metadata: voteDto.metadata,
          createdBy: userId,
          updatedBy: userId,
        });

        vote = await this.voteRepository.save(vote);
        voteValueDelta = vote.value;
      }

      // Update post vote counts
      await this.updatePostVoteCounts(postId, voteValueDelta);

      // Update thread stats
      await this.threadService.updateStats(post.thread.id, 0, voteValueDelta);

      // Award/deduct reputation
      reputationDelta = this.getReputationDelta(voteDto.voteType);
      if (reputationDelta !== 0) {
        await this.reputationService.awardPoints(
          post.authorId,
          this.getReputationReason(voteDto.voteType),
          reputationDelta,
          postId,
          userId,
        );
      }

      // Clear cache
      await this.cacheService.del(`forum:post:${postId}`);
      await this.cacheService.del(`forum:thread:${post.thread.id}:posts:*`);

      this.logger.log(`Forum post voted, {
        ${postId},
        ${userId},
        voteType: ${voteDto.voteType},
        value: ${vote.value},
      }`);

      return vote;
    } catch (error) {
      this.logger.error(`Failed to vote on forum post, error, {
        ${postId},
        ${userId},
        ${voteDto},
      }`);
      throw error;
    }
  }

  async removeVote(postId: string, userId: string): Promise<void> {
    try {
      const vote = await this.voteRepository.findOne({
        where: { postId, userId },
      });

      if (!vote) {
        throw new NotFoundException('Vote not found');
      }

      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['thread'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Remove vote
      await this.voteRepository.remove(vote);

      // Update post vote counts
      await this.updatePostVoteCounts(postId, -vote.value);

      // Update thread stats
      await this.threadService.updateStats(post.thread.id, 0, -vote.value);

      // Revert reputation
      const reputationDelta = -this.getReputationDelta(vote.voteType);
      if (reputationDelta !== 0) {
        await this.reputationService.awardPoints(
          post.authorId,
          'vote_removed',
          reputationDelta,
          postId,
          userId,
        );
      }

      // Clear cache
      await this.cacheService.del(`forum:post:${postId}`);
      await this.cacheService.del(`forum:thread:${post.thread.id}:posts:*`);

      this.logger.log(`Forum post vote removed, {
        ${postId},
        ${userId},
        voteType: ${vote.voteType},
      }`);
    } catch (error) {
      this.logger.error(`Failed to remove forum post vote, error, {
        ${postId},
        ${userId},
      }`);
      throw error;
    }
  }

  async getUserVote(postId: string, userId: string): Promise<ForumPostVote | null> {
    return this.voteRepository.findOne({
      where: { postId, userId },
    });
  }

  async getPostVotes(postId: string): Promise<ForumPostVote[]> {
    return this.voteRepository.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  private getVoteValue(voteType: ForumVoteType): number {
    switch (voteType) {
      case ForumVoteType.UPVOTE:
      case ForumVoteType.HELPFUL:
      case ForumVoteType.AGREE:
        return 1;
      case ForumVoteType.DOWNVOTE:
      case ForumVoteType.NOT_HELPFUL:
      case ForumVoteType.DISAGREE:
        return -1;
      default:
        return 0;
    }
  }

  private getReputationDelta(voteType: ForumVoteType): number {
    switch (voteType) {
      case ForumVoteType.UPVOTE:
        return 10;
      case ForumVoteType.DOWNVOTE:
        return -2;
      case ForumVoteType.HELPFUL:
        return 2;
      case ForumVoteType.NOT_HELPFUL:
        return -1;
      default:
        return 0;
    }
  }

  private getReputationReason(voteType: ForumVoteType): string {
    switch (voteType) {
      case ForumVoteType.UPVOTE:
        return 'post_upvoted';
      case ForumVoteType.DOWNVOTE:
        return 'post_downvoted';
      case ForumVoteType.HELPFUL:
        return 'helpful_vote';
      case ForumVoteType.NOT_HELPFUL:
        return 'not_helpful_vote';
      default:
        return 'vote_received';
    }
  }

  private async updatePostVoteCounts(postId: string, valueDelta: number): Promise<void> {
    const updateData: any = {
      score: () => `score + ${valueDelta}`,
    };

    if (valueDelta > 0) {
      updateData.upvoteCount = () => `upvoteCount + 1`;
    } else if (valueDelta < 0) {
      updateData.downvoteCount = () => `downvoteCount + 1`;
    }

    await this.postRepository.update(postId, updateData);
  }
}
