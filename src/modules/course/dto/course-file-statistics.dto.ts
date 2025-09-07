import { ApiProperty } from '@nestjs/swagger';

export class CourseFileStatisticsDto {
  @ApiProperty({ description: 'Course ID', example: 'uuid-v4' })
  courseId: string;

  @ApiProperty({ description: 'Total number of files uploaded for this course' })
  totalFiles: number;

  @ApiProperty({
    description: 'File counts grouped by type',
    example: {
      video: 5,
      audio: 2,
      image: 10,
      document: 3,
      thumbnail: 1,
      trailer: 1,
      lesson: 8,
      promotional: 2,
    },
  })
  filesByType: {
    video: number;
    audio: number;
    image: number;
    document: number;
    thumbnail: number;
    trailer: number;
    lesson: number;
    promotional: number;
  };

  @ApiProperty({ description: 'Total size in bytes' })
  totalSize: number;

  @ApiProperty({ description: 'Total size in megabytes' })
  totalSizeMB: number;
}