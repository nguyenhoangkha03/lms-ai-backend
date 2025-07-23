import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { TeacherProfile } from '../entities/teacher-profile.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CacheService } from '@/cache/cache.service';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let userProfileRepository: jest.Mocked<Repository<UserProfile>>;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;
  let _teacherProfileRepository: jest.Mocked<Repository<TeacherProfile>>;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let _permissionRepository: jest.Mocked<Repository<Permission>>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    userType: 'student',
    status: 'active',
    profile: null,
    studentProfile: null,
    teacherProfile: null,
    roles: [],
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(TeacherProfile),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Role),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: createMockRepository(),
        },
        {
          provide: CacheService,
          useValue: createMockCacheService(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    userProfileRepository = module.get(getRepositoryToken(UserProfile));
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
    _teacherProfileRepository = module.get(getRepositoryToken(TeacherProfile));
    roleRepository = module.get(getRepositoryToken(Role));
    _permissionRepository = module.get(getRepositoryToken(Permission));
    cacheService = module.get(CacheService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        relations: ['profile', 'studentProfile', 'teacherProfile', 'roles', 'permissions'],
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should use cache when available', async () => {
      cacheService.get.mockResolvedValue(JSON.stringify(mockUser));

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(cacheService.get).toHaveBeenCalledWith('user:user-1');
      expect(userRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      username: 'newuser',
      passwordHash: 'hashed-password',
      userType: 'student',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);
      userProfileRepository.create.mockReturnValue({} as UserProfile);
      userProfileRepository.save.mockResolvedValue({} as UserProfile);
      studentProfileRepository.create.mockReturnValue({} as StudentProfile);
      studentProfileRepository.save.mockResolvedValue({} as StudentProfile);

      const result = await service.create(createUserDto as any);

      expect(result).toEqual(mockUser);
      expect(userRepository.save).toHaveBeenCalled();
      expect(userProfileRepository.save).toHaveBeenCalled();
      expect(studentProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.create(createUserDto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('getUsersWithFilters', () => {
    const queryDto = {
      page: 1,
      limit: 10,
      userType: 'student',
      status: 'active',
      search: 'test',
    };

    it('should return paginated users with filters', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder();
      const mockResult = {
        items: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[mockUser], 1]);

      const result = await service.getUsersWithFilters(queryDto as any);

      expect(result).toEqual(mockResult);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('updateProfile', () => {
    const updateDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user profile successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userProfileRepository.save.mockResolvedValue({} as UserProfile);

      const result = await service.updateProfile('user-1', updateDto as any);

      // Assert
      expect(result).toBeDefined();
      expect(userProfileRepository.save).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledWith('user:user-1');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('user-1', updateDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const mockRole = { id: 'role-1', name: 'admin' };
      userRepository.findOne.mockResolvedValue({ ...mockUser, roles: [] } as any);
      roleRepository.findOne.mockResolvedValue(mockRole as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      await service.assignRoles('user-1', ['role-1']);

      expect(userRepository.save).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledWith('user:user-1');
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.save.mockResolvedValue({ ...mockUser, deletedAt: new Date() } as any);

      await service.deleteUser('user-1');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:user-1');
    });
  });
});
