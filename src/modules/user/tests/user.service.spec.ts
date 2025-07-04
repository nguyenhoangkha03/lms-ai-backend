import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { TeacherProfile } from '../entities/teacher-profile.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CacheService } from '@/cache/cache.service';
import { UserType, UserStatus } from '@/common/enums/user.enums';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let _userProfileRepository: Repository<UserProfile>;
  let _studentProfileRepository: Repository<StudentProfile>;
  let _teacherProfileRepository: Repository<TeacherProfile>;
  let _roleRepository: Repository<Role>;
  let _permissionRepository: Repository<Permission>;
  let cacheService: CacheService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    userType: UserType.STUDENT,
    status: UserStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findBy: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TeacherProfile),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            findBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: {
            findBy: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    _userProfileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile));
    _studentProfileRepository = module.get<Repository<StudentProfile>>(
      getRepositoryToken(StudentProfile),
    );
    _teacherProfileRepository = module.get<Repository<TeacherProfile>>(
      getRepositoryToken(TeacherProfile),
    );
    _roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    _permissionRepository = module.get<Repository<Permission>>(getRepositoryToken(Permission));
    cacheService = module.get<CacheService>(CacheService);
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'password123',
        userType: UserType.STUDENT,
      };

      jest.spyOn(service, 'findByEmailOrUsername').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser as User);
      jest.spyOn(service as any, 'createUserProfile').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'generateUserCodes').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'assignDefaultRole').mockResolvedValue(undefined);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          username: createUserDto.username,
          userType: createUserDto.userType,
          status: UserStatus.PENDING,
        }),
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'password123',
        userType: UserType.STUDENT,
      };

      jest.spyOn(service, 'findByEmailOrUsername').mockResolvedValue(mockUser as User);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };

      jest.spyOn(userRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(queryBuilder.where).toHaveBeenCalledWith('user.id = :id', { id: '1' });
    });

    it('should throw NotFoundException if user not found', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(userRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update status for multiple users', async () => {
      const bulkUpdateDto = {
        userIds: ['1', '2', '3'],
        status: UserStatus.ACTIVE,
        reason: 'Bulk activation',
      };

      jest
        .spyOn(userRepository, 'update')
        .mockResolvedValue({ affected: 3, raw: [], generatedMaps: [] });
      jest.spyOn(service as any, 'clearUserCache').mockResolvedValue(undefined);

      const result = await service.bulkUpdateStatus(bulkUpdateDto);

      expect(result.affected).toBe(3);
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: expect.any(Object) },
        expect.objectContaining({
          status: UserStatus.ACTIVE,
          metadata: { statusChangeReason: 'Bulk activation' },
        }),
      );
    });
  });
});
