import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { RoleService } from '../services/role.service';
import { PermissionService } from '../services/permission.service';
import { FileUploadService } from '../services/file-upload.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { UpdateStudentProfileDto } from '../dto/update-student-profile.dto';
import { UpdateTeacherProfileDto } from '../dto/update-teacher-profile.dto';
import {
  BulkUpdateStatusDto,
  BulkAssignRolesDto,
  BulkUserIdsDto,
  ImportUsersDto,
} from '../dto/bulk-user-operations.dto';
import { User } from '../entities/user.entity';
import { PermissionAction, PermissionResource, UserType } from '@/common/enums/user.enums';
import { WinstonService } from '@/logger/winston.service';
import { SecurityEventInterceptor } from '../../auth/interceptors/security-event.interceptor';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { OwnerOnly } from '../../auth/decorators/owner-only.decorator';
import { RequireApiKey } from '../../auth/decorators/api-key.decorator';

@ApiTags('User Management')
@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(SecurityEventInterceptor)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
    private readonly fileUploadService: FileUploadService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(UserController.name);
  }

  // ==================== USER CRUD OPERATIONS ====================

  @Post()
  @Authorize({
    roles: [UserType.ADMIN],
    rateLimit: { points: 10, duration: 60 }, // 10 requests per minute
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Authorize({
    permissions: ['read:user'],
    rateLimit: { points: 100, duration: 60 }, // 100 requests per minute
  })
  @UseGuards(PermissionsGuard)
  @Permissions('read:user')
  @ApiOperation({ summary: 'Get all users with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() queryDto: UserQueryDto) {
    return this.userService.findAll(queryDto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.userService.findById(user.id, {
      includeProfiles: true,
      includeRoles: true,
    });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Get user statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getUserStats() {
    return this.userService.getUserStats();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('read:user')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiQuery({ name: 'includeProfiles', required: false, type: Boolean })
  @ApiQuery({ name: 'includeRoles', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeProfiles') includeProfiles?: boolean,
    @Query('includeRoles') includeRoles?: boolean,
  ) {
    return this.userService.findById(id, { includeProfiles, includeRoles });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(user.id, updateUserDto);
  }

  @Patch(':id')
  @Authorize({
    resource: {
      resource: PermissionResource.USER,
      action: PermissionAction.UPDATE,
      allowOwner: true, // Users can update their own profile
      ownerField: 'userId',
    },
  })
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  // Owner-only access for profile updates
  @Patch(':id/profile')
  @OwnerOnly({
    entityType: 'User',
    entityField: 'id',
    userField: 'id', // User can only update their own profile
    allowedRoles: [UserType.ADMIN], // Admins can update any profile
  })
  async updateProfileOwner(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateUserProfileDto,
  ) {
    return this.userService.updateUserProfile(id, updateProfileDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('delete:user')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.delete(id);
  }

  // ==================== PROFILE MANAGEMENT ====================

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update current user detailed profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateUserProfile(@CurrentUser() user: User, @Body() updateDto: UpdateUserProfileDto) {
    return this.userService.updateUserProfile(user.id, updateDto);
  }

  @Patch('me/student-profile')
  @ApiOperation({ summary: 'Update current user student profile' })
  @ApiResponse({ status: 200, description: 'Student profile updated successfully' })
  async updateStudentProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateStudentProfileDto,
  ) {
    return this.userService.updateStudentProfile(user.id, updateDto);
  }

  @Patch('me/teacher-profile')
  @ApiOperation({ summary: 'Update current user teacher profile' })
  @ApiResponse({ status: 200, description: 'Teacher profile updated successfully' })
  async updateTeacherProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateTeacherProfileDto,
  ) {
    return this.userService.updateTeacherProfile(user.id, updateDto);
  }

  // ==================== FILE UPLOAD ====================

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  async uploadAvatar(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const avatarUrl = await this.fileUploadService.uploadAvatar(user.id, file);
    return this.userService.updateAvatar(user.id, avatarUrl);
  }

  @Post('me/cover')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user cover image' })
  @ApiResponse({ status: 200, description: 'Cover image uploaded successfully' })
  async uploadCoverImage(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const coverUrl = await this.fileUploadService.uploadCoverImage(user.id, file);
    return this.userService.updateCoverImage(user.id, coverUrl);
  }

  // ==================== USER STATUS MANAGEMENT ====================

  @Patch(':id/activate')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.activateUser(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async deactivateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.deactivateUser(id);
  }

  @Patch(':id/suspend')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Suspend user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  async suspendUser(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason?: string) {
    return this.userService.suspendUser(id, reason);
  }

  @Patch(':id/verify-email')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Manually verify user email' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.verifyEmailWithToken(id);
  }

  // ==================== ROLE MANAGEMENT ====================

  @Post(':id/roles')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Roles assigned successfully' })
  async assignRoles(@Param('id', ParseUUIDPipe) id: string, @Body('roleIds') roleIds: string[]) {
    return this.userService.assignRoles(id, roleIds);
  }

  @Delete(':id/roles')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Remove roles from user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Roles removed successfully' })
  async removeRoles(@Param('id', ParseUUIDPipe) id: string, @Body('roleIds') roleIds: string[]) {
    return this.userService.removeRoles(id, roleIds);
  }

  @Post(':id/permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Assign permissions to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.userService.assignPermissions(id, permissionIds);
  }

  @Get(':id/permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('read:user')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved' })
  async getUserPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserPermissions(id);
  }

  // ==================== BULK OPERATIONS ====================

  @Patch('bulk/status')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Bulk update user status' })
  @ApiResponse({ status: 200, description: 'Users status updated successfully' })
  async bulkUpdateStatus(@Body() bulkUpdateDto: BulkUpdateStatusDto) {
    return this.userService.bulkUpdateStatus(bulkUpdateDto);
  }

  @Post('bulk/roles')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @ApiOperation({ summary: 'Bulk assign roles to users' })
  @ApiResponse({ status: 200, description: 'Roles assigned to users successfully' })
  async bulkAssignRoles(@Body() bulkAssignDto: BulkAssignRolesDto) {
    return this.userService.bulkAssignRoles(bulkAssignDto);
  }

  @Delete('bulk')
  @UseGuards(PermissionsGuard)
  @Permissions('delete:user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete users' })
  @ApiResponse({ status: 200, description: 'Users deleted successfully' })
  async bulkDelete(@Body() bulkDeleteDto: BulkUserIdsDto) {
    return this.userService.bulkDelete(bulkDeleteDto.userIds);
  }

  // ==================== IMPORT/EXPORT ====================

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Import users from CSV (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users imported successfully' })
  async importUsers(@Body() importDto: ImportUsersDto) {
    return this.userService.importUsers(importDto);
  }

  @Get('export')
  @RequireApiKey()
  @Authorize({
    permissions: ['export:user'],
    rateLimit: { points: 5, duration: 3600 }, // 5 exports per hour
  })
  @UseGuards(PermissionsGuard)
  @Permissions('read:user')
  @ApiOperation({ summary: 'Export users to CSV' })
  @ApiResponse({ status: 200, description: 'Users exported successfully' })
  async exportUsers(@Query() queryDto: UserQueryDto) {
    const csvContent = await this.userService.exportUsers(queryDto);
    return {
      content: csvContent,
      filename: `users-export-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
    };
  }
}
