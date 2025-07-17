import { Controller, Get, Query, HttpStatus, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ForumSearchService } from '../services/forum-search.service';
import { ForumSearchDto } from '../dto/forum-search.dto';
import { ForumSearchResponseDto } from '../dto/forum-responses.dto';

@ApiTags('Forum Search')
@Controller('forum/search')
export class ForumSearchController {
  constructor(private readonly searchService: ForumSearchService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Search forum content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: ForumSearchResponseDto,
  })
  async search(@Query() searchDto: ForumSearchDto): Promise<ForumSearchResponseDto> {
    return this.searchService.search(searchDto);
  }

  @Get('suggestions')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search suggestions retrieved successfully',
  })
  async getSuggestions(@Query('q') query: string): Promise<string[]> {
    return this.searchService.getSuggestions(query);
  }
}
