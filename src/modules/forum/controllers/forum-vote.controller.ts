import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ForumVoteService } from '../services/forum-vote.service';
import { CreateForumVoteDto } from '../dto/forum-vote.dto';

@ApiTags('Forum Votes')
@Controller('forum/votes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ForumVoteController {
  constructor(private readonly voteService: ForumVoteService) {}

  @Post('posts/:postId')
  @ApiOperation({ summary: 'Vote on a forum post' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vote submitted successfully',
  })
  async vote(
    @Param('postId') postId: string,
    @Body() voteDto: CreateForumVoteDto,
    @Request() req: any,
  ) {
    return this.voteService.vote(postId, req.user.sub, voteDto);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: 'Remove vote from a forum post' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Vote removed successfully',
  })
  async removeVote(@Param('postId') postId: string, @Request() req: any): Promise<void> {
    return this.voteService.removeVote(postId, req.user.sub);
  }

  @Get('posts/:postId/user')
  @ApiOperation({ summary: 'Get user vote on a post' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User vote retrieved successfully',
  })
  async getUserVote(@Param('postId') postId: string, @Request() req: any) {
    return this.voteService.getUserVote(postId, req.user.sub);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: 'Get all votes on a post' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post votes retrieved successfully',
  })
  async getPostVotes(@Param('postId') postId: string) {
    return this.voteService.getPostVotes(postId);
  }
}
