import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsObject,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WhiteboardToolType, WhiteboardPermission } from '@/common/enums/collaborative.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreateWhiteboardDto {
  @ApiProperty({ description: 'Whiteboard name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Whiteboard description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Associated study group ID' })
  @IsOptional()
  @IsUUID()
  studyGroupId?: string;

  @ApiPropertyOptional({ description: 'Canvas width', minimum: 800, maximum: 4000 })
  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(4000)
  canvasWidth?: number;

  @ApiPropertyOptional({ description: 'Canvas height', minimum: 600, maximum: 3000 })
  @IsOptional()
  @IsNumber()
  @Min(600)
  @Max(3000)
  canvasHeight?: number;

  @ApiPropertyOptional({ description: 'Background color' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiProperty({ enum: WhiteboardPermission, description: 'Default permission for members' })
  @IsOptional()
  @IsEnum(WhiteboardPermission)
  defaultPermission?: WhiteboardPermission;
}

export class UpdateWhiteboardDto {
  @ApiPropertyOptional({ description: 'Whiteboard name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Whiteboard description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Background color' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Is whiteboard locked' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiProperty({ enum: WhiteboardPermission, description: 'Default permission for members' })
  @IsOptional()
  @IsEnum(WhiteboardPermission)
  defaultPermission?: WhiteboardPermission;

  @ApiPropertyOptional({ description: 'Whiteboard data' })
  @IsOptional()
  @IsObject()
  canvasData?: any;
}

export class CreateWhiteboardElementDto {
  @ApiProperty({ description: 'Whiteboard ID' })
  @IsUUID()
  whiteboardId: string;

  @ApiProperty({ enum: WhiteboardToolType, description: 'Element type' })
  @IsEnum(WhiteboardToolType)
  type: WhiteboardToolType;

  @ApiProperty({ description: 'Element data' })
  @IsObject()
  elementData: any;

  @ApiProperty({ description: 'X coordinate' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y coordinate' })
  @IsNumber()
  y: number;

  @ApiPropertyOptional({ description: 'Element width' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Element height' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Element rotation' })
  @IsOptional()
  @IsNumber()
  rotation?: number;

  @ApiPropertyOptional({ description: 'Element color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Stroke width' })
  @IsOptional()
  @IsNumber()
  strokeWidth?: number;

  @ApiPropertyOptional({ description: 'Element opacity', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;
}

export class WhiteboardQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by study group ID' })
  @IsOptional()
  @IsUUID()
  studyGroupId?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;
}
