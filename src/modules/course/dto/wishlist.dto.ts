import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddToWishlistDto {
  @ApiProperty({
    description: 'Course ID to add to wishlist',
    example: 'b3968208-7858-45c9-9cf5-54262c369426'
  })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}

export class RemoveFromWishlistDto {
  @ApiProperty({
    description: 'Course ID to remove from wishlist',
    example: 'b3968208-7858-45c9-9cf5-54262c369426'
  })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}

export class WishlistResponseDto {
  @ApiProperty({
    description: 'Wishlist item ID',
    example: 'b3968208-7858-45c9-9cf5-54262c369426'
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'b3968208-7858-45c9-9cf5-54262c369426'
  })
  userId: string;

  @ApiProperty({
    description: 'Course ID',
    example: 'b3968208-7858-45c9-9cf5-54262c369426'
  })
  courseId: string;

  @ApiProperty({
    description: 'Date added to wishlist',
    example: '2024-01-15T08:30:00Z'
  })
  createdAt: Date;
}

export class WishlistCheckResponseDto {
  @ApiProperty({
    description: 'Whether the course is in user\'s wishlist',
    example: true
  })
  inWishlist: boolean;

  @ApiProperty({
    description: 'Wishlist item ID if exists',
    example: 'b3968208-7858-45c9-9cf5-54262c369426',
    required: false
  })
  wishlistId?: string;
}