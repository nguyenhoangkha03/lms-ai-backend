import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../entities/wishlist.entity';
import { Course } from '../entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private logger: WinstonService,
  ) {
    this.logger.setContext(WishlistService.name);
  }

  async addToWishlist(userId: string, courseId: string): Promise<Wishlist> {
    try {
      // Check if course exists
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      // Check if already in wishlist
      const existingItem = await this.wishlistRepository.findOne({
        where: { userId, courseId },
      });

      if (existingItem) {
        throw new ConflictException('Course already in wishlist');
      }

      // Create wishlist item
      const wishlistItem = this.wishlistRepository.create({
        userId,
        courseId,
      });

      const savedItem = await this.wishlistRepository.save(wishlistItem);

      this.logger.log(
        `User ${userId} added course ${courseId} to wishlist`,
        'AddToWishlist'
      );

      return savedItem;
    } catch (error) {
      this.logger.error(
        `Failed to add course ${courseId} to wishlist for user ${userId}`,
        error.stack,
        'AddToWishlist'
      );
      throw error;
    }
  }

  async removeFromWishlist(userId: string, courseId: string): Promise<void> {
    try {
      const result = await this.wishlistRepository.delete({
        userId,
        courseId,
      });

      if (result.affected === 0) {
        throw new NotFoundException('Course not found in wishlist');
      }

      this.logger.log(
        `User ${userId} removed course ${courseId} from wishlist`,
        'RemoveFromWishlist'
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove course ${courseId} from wishlist for user ${userId}`,
        error.stack,
        'RemoveFromWishlist'
      );
      throw error;
    }
  }

  async checkInWishlist(userId: string, courseId: string): Promise<{ inWishlist: boolean; wishlistId?: string }> {
    try {
      const wishlistItem = await this.wishlistRepository.findOne({
        where: { userId, courseId },
      });

      return {
        inWishlist: !!wishlistItem,
        wishlistId: wishlistItem?.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check wishlist status for course ${courseId} and user ${userId}`,
        error.stack,
        'CheckInWishlist'
      );
      return { inWishlist: false };
    }
  }

  async getUserWishlist(userId: string, page = 1, limit = 10) {
    try {
      const [items, total] = await this.wishlistRepository.findAndCount({
        where: { userId },
        relations: ['course', 'course.teacher', 'course.category'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data: items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get wishlist for user ${userId}`,
        error.stack,
        'GetUserWishlist'
      );
      throw error;
    }
  }

  async getWishlistCount(userId: string): Promise<number> {
    try {
      return await this.wishlistRepository.count({
        where: { userId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get wishlist count for user ${userId}`,
        error.stack,
        'GetWishlistCount'
      );
      return 0;
    }
  }

  async clearWishlist(userId: string): Promise<void> {
    try {
      await this.wishlistRepository.delete({ userId });

      this.logger.log(
        `Cleared wishlist for user ${userId}`,
        'ClearWishlist'
      );
    } catch (error) {
      this.logger.error(
        `Failed to clear wishlist for user ${userId}`,
        error.stack,
        'ClearWishlist'
      );
      throw error;
    }
  }
}