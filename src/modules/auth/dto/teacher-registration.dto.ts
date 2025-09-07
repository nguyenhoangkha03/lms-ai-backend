import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DegreeLevel {
  BACHELOR = 'bachelor',
  MASTER = 'master',
  PHD = 'phd',
  ASSOCIATE = 'associate',
  DIPLOMA = 'diploma',
  OTHER = 'other',
}

export enum ExperienceLevel {
  ENTRY = 'entry', // 0-2 years
  INTERMEDIATE = 'intermediate', // 3-5 years
  EXPERIENCED = 'experienced', // 6-10 years
  EXPERT = 'expert', // 10+ years
}

export class PersonalInfoDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

}

export class EducationDto {
  @ApiProperty({ example: 'master', enum: DegreeLevel })
  @IsEnum(DegreeLevel)
  @IsNotEmpty()
  highestDegree: DegreeLevel;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fieldOfStudy: string;

  @ApiProperty({ example: 'MIT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  institution: string;

  @ApiProperty({ example: 2020 })
  @IsNotEmpty()
  graduationYear: number;

  @ApiPropertyOptional({ example: 'AWS Certified Solutions Architect' })
  @IsOptional()
  @IsString()
  additionalCertifications?: string;
}

export class ExperienceDto {
  @ApiProperty({ example: 'experienced', enum: ExperienceLevel })
  @IsEnum(ExperienceLevel)
  @IsNotEmpty()
  teachingExperience: ExperienceLevel;

  @ApiProperty({ example: ['Mathematics', 'Physics', 'Computer Science'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  subjectAreas: string[];

  @ApiPropertyOptional({ example: 'Harvard University, Stanford University' })
  @IsOptional()
  @IsString()
  previousInstitutions?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  onlineTeachingExperience: boolean;

  @ApiPropertyOptional({ example: '500+' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  totalStudentsTaught?: string;
}

export class MotivationDto {
  @ApiProperty({ example: 'I am passionate about sharing knowledge and helping students grow.' })
  @IsString()
  @IsNotEmpty()
  whyTeach: string;

  @ApiProperty({ example: 'I believe in hands-on, interactive learning approach.' })
  @IsString()
  @IsNotEmpty()
  teachingPhilosophy: string;

  @ApiPropertyOptional({ example: 'Public speaking, curriculum design, educational technology' })
  @IsOptional()
  @IsString()
  specialSkills?: string;

  @ApiPropertyOptional({ example: 'Advanced Machine Learning, Data Science for Beginners' })
  @IsOptional()
  @IsString()
  courseIdeas?: string;
}

export class AvailabilityDto {
  @ApiPropertyOptional({ example: '20-30 hours' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  hoursPerWeek?: string;

  @ApiPropertyOptional({ example: ['Monday Morning', 'Wednesday Evening', 'Saturday'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSchedule?: string[];

  @ApiPropertyOptional({ example: '2024-02-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}

export class DocumentsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  resumeUploaded: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  degreeUploaded: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  certificationUploaded?: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  idUploaded: boolean;
}

export class ProfessionalDto {
  @ApiPropertyOptional({ example: 'Interactive and hands-on approach' })
  @IsOptional()
  @IsString()
  teachingStyle?: string;

  @ApiPropertyOptional({ example: 'Mon-Fri 9AM-5PM EST' })
  @IsOptional()
  @IsString()
  officeHours?: string;

  @ApiPropertyOptional({ example: ['English', 'Spanish'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teachingLanguages?: string[];

  @ApiPropertyOptional({ example: '25' })
  @IsOptional()
  @IsString()
  hourlyRate?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Experienced educator with 10+ years...' })
  @IsOptional()
  @IsString()
  professionalSummary?: string;

  @ApiPropertyOptional({ example: 'https://myportfolio.com' })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: 'LIC123456' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: 'NEA, IEEE' })
  @IsOptional()
  @IsString()
  affiliations?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsString()
  maxStudentsPerClass?: string;

  @ApiPropertyOptional({ example: ['Teacher of the Year 2023'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  awards?: string[];

  @ApiPropertyOptional({ example: ['Research Paper on AI in Education'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  publications?: string[];

  @ApiPropertyOptional({ example: ['AI', 'Machine Learning', 'Web Development'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ example: ['Python', 'JavaScript', 'Teaching'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

export class AgreementsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  termsAccepted: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  backgroundCheckConsent: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  communicationConsent: boolean;
}

export class TeacherRegistrationDto {
  @ApiProperty()
  @IsNotEmpty()
  personalInfo: PersonalInfoDto;

  @ApiProperty()
  @IsNotEmpty()
  education: EducationDto;

  @ApiProperty()
  @IsNotEmpty()
  experience: ExperienceDto;


  @ApiProperty()
  @IsNotEmpty()
  motivation: MotivationDto;

  @ApiPropertyOptional()
  @IsOptional()
  availability?: AvailabilityDto;

  @ApiProperty()
  @IsNotEmpty()
  documents: DocumentsDto;

  @ApiProperty()
  @IsNotEmpty()
  agreements: AgreementsDto;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}