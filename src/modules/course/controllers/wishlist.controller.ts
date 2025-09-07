import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SecurityEventInterceptor } from '../../auth/interceptors/security-event.interceptor';
import { WinstonService } from '@/logger/winston.service';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../user/entities/user.entity';
import { UserType, PermissionAction, PermissionResource } from '@/common/enums/user.enums';
import { WishlistService } from '../services/wishlist.service';
import {
  AddToWishlistDto,
  RemoveFromWishlistDto,
  WishlistResponseDto,
  WishlistCheckResponseDto,
} from '../dto/wishlist.dto';

@ApiTags('Student Wishlist')
@Controller('wishlist')
// @UseInterceptors(SecurityEventInterceptor)
@ApiBearerAuth()
@Authorize({
  roles: [UserType.STUDENT],
})
export class WishlistController {
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(WishlistController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add course to wishlist' })
  @ApiResponse({
    status: 201,
    description: 'Course added to wishlist successfully',
    type: WishlistResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'Course already in wishlist' })
  async addToWishlist(@CurrentUser() user: User, @Body() dto: AddToWishlistDto) {
    const wishlistItem = await this.wishlistService.addToWishlist(user.id, dto.courseId);

    return {
      success: true,
      message: 'Course added to wishlist successfully',
      data: wishlistItem,
    };
  }

  @Delete('course/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove course from wishlist' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course removed from wishlist' })
  @ApiResponse({ status: 404, description: 'Course not found in wishlist' })
  async removeFromWishlist(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    await this.wishlistService.removeFromWishlist(user.id, courseId);

    return {
      success: true,
      message: 'Course removed from wishlist successfully',
    };
  }

  @Get('check/:courseId')
  @ApiOperation({ summary: 'Check if course is in wishlist' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist check result',
    type: WishlistCheckResponseDto,
  })
  async checkInWishlist(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    const result = await this.wishlistService.checkInWishlist(user.id, courseId);

    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'User wishlist retrieved' })
  async getUserWishlist(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.wishlistService.getUserWishlist(user.id, page || 1, limit || 10);

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('count')
  @ApiOperation({ summary: 'Get wishlist items count' })
  @ApiResponse({ status: 200, description: 'Wishlist count retrieved' })
  async getWishlistCount(@CurrentUser() user: User) {
    const count = await this.wishlistService.getWishlistCount(user.id);

    return {
      success: true,
      data: { count },
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear entire wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared successfully' })
  async clearWishlist(@CurrentUser() user: User) {
    await this.wishlistService.clearWishlist(user.id);

    return {
      success: true,
      message: 'Wishlist cleared successfully',
    };
  }
}
