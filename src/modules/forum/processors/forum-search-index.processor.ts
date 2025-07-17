import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
@Processor('forum-search-index')
export class ForumSearchIndexProcessor {
  constructor(private readonly logger: WinstonService) {}

  @Process('index-thread')
  async indexThread(job: Job) {
    const { threadId, title, _content, tags, categoryId } = job.data;

    try {
      // Here you would implement search indexing
      // This could be Elasticsearch, Algolia, or a custom search solution

      this.logger.log(`Thread indexed for search, {
        ${threadId},
        ${title},
        ${categoryId},
        ${tags},
      }`);
    } catch (error) {
      this.logger.error('Failed to index thread for search', error);
      throw error;
    }
  }

  @Process('index-post')
  async indexPost(job: Job) {
    const { postId, _content, threadId, authorId } = job.data;

    try {
      // Index post content for search

      this.logger.log(`Post indexed for search, {
        ${postId},
        ${threadId},
        ${authorId},
      }`);
    } catch (error) {
      this.logger.error('Failed to index post for search', error);
      throw error;
    }
  }

  @Process('remove-from-index')
  async removeFromIndex(job: Job) {
    const { id, type } = job.data; // type: 'thread' or 'post'

    try {
      // Remove from search index

      this.logger.log(`Content removed from search index, {
        ${id},
        ${type},
      }`);
    } catch (error) {
      this.logger.error('Failed to remove content from search index', error);
      throw error;
    }
  }
}
