import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
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
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { CartService } from '../services/cart.service';
import {
  AddToCartDto,
  RemoveFromCartDto,
  CartQueryDto,
  BulkCartOperationDto,
  CartResponseDto,
  CartItemResponseDto,
} from '../dto/cart.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user cart',
    description: 'Lấy thông tin các khóa học trong giỏ hàng của người dùng hiện tại',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    type: CartResponseDto,
  })
  @ApiQuery({
    name: 'includeCourseDetails',
    required: false,
    description: 'Include detailed course information',
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeTeacher',
    required: false,
    description: 'Include teacher information',
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeStats',
    required: false,
    description: 'Include cart statistics',
    type: Boolean,
  })
  async getCart(
    @CurrentUser('id') userId: string,
    @Query() queryDto: CartQueryDto,
  ): Promise<CartResponseDto> {
    return this.cartService.getCartByUserId(userId, queryDto);
  }

  @Post()
  @ApiOperation({
    summary: 'Add course to cart',
    description: 'Thêm một khóa học vào giỏ hàng',
  })
  @ApiResponse({
    status: 201,
    description: 'Course added to cart successfully',
    type: CartItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - course is free, already enrolled, etc.',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Course already in cart',
  })
  async addToCart(
    @CurrentUser('id') userId: string,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartItemResponseDto> {
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Delete('items/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove course from cart',
    description: 'Xóa một khóa học khỏi giỏ hàng',
  })
  @ApiParam({
    name: 'courseId',
    description: 'ID of the course to remove',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Course removed from cart successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found in cart',
  })
  async removeFromCart(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.cartService.removeFromCart(userId, courseId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear cart',
    description: 'Xóa tất cả khóa học khỏi giỏ hàng',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
  })
  async clearCart(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.cartService.clearCart(userId);
  }

  @Post('bulk/add')
  @ApiOperation({
    summary: 'Bulk add courses to cart',
    description: 'Thêm nhiều khóa học vào giỏ hàng cùng lúc',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk operation completed',
  })
  async bulkAddToCart(
    @CurrentUser('id') userId: string,
    @Body() bulkDto: BulkCartOperationDto,
  ): Promise<{ success: boolean; added: number; failed: string[] }> {
    return this.cartService.bulkAddToCart(userId, bulkDto);
  }

  @Delete('bulk/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk remove courses from cart',
    description: 'Xóa nhiều khóa học khỏi giỏ hàng cùng lúc',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk removal completed',
  })
  async bulkRemoveFromCart(
    @CurrentUser('id') userId: string,
    @Body() bulkDto: BulkCartOperationDto,
  ): Promise<{ success: boolean; removed: number; failed: string[] }> {
    return this.cartService.bulkRemoveFromCart(userId, bulkDto);
  }

  @Get('count')
  @ApiOperation({
    summary: 'Get cart item count',
    description: 'Lấy số lượng khóa học trong giỏ hàng',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
        success: { type: 'boolean' },
      },
    },
  })
  async getCartCount(
    @CurrentUser('id') userId: string,
  ): Promise<{ count: number; success: boolean }> {
    const count = await this.cartService.getCartItemCount(userId);
    return { count, success: true };
  }

  @Get('check/:courseId')
  @ApiOperation({
    summary: 'Check if course is in cart',
    description: 'Kiểm tra xem khóa học có trong giỏ hàng hay không',
  })
  @ApiParam({
    name: 'courseId',
    description: 'ID of the course to check',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Check result',
    schema: {
      type: 'object',
      properties: {
        inCart: { type: 'boolean' },
        success: { type: 'boolean' },
      },
    },
  })
  async checkInCart(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
  ): Promise<{ inCart: boolean; success: boolean }> {
    const inCart = await this.cartService.isInCart(userId, courseId);
    return { inCart, success: true };
  }
}