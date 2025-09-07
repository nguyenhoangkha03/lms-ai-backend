import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import { WinstonService } from '@/logger/winston.service';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserType } from '@/common/enums/user.enums';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { Permissions } from '@/modules/auth/decorators/permissions.decorator';
import { Authorize } from '@/modules/auth/decorators/authorize.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Role Management')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(RoleController.name);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Create new role (Admin only)' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async create(@Body() createRoleDto: any) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @Public() // Temporary - remove after testing
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async findAll() {
    const roles = await this.roleService.findAll();
    // Debug log to check date format
    console.log('Roles from service:', JSON.stringify(roles, null, 2));
    return roles;
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('read:role')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleService.findById(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  //   @Permissions('update:role')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateRoleDto: any) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Post(':id/permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('update:role')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.roleService.assignPermissions(id, permissionIds);
  }

  @Delete(':id/permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('update:role')
  @ApiOperation({ summary: 'Remove permissions from role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Permissions removed successfully' })
  async removePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.roleService.removePermissions(id, permissionIds);
  }

  @Delete(':id')
  @Authorize({
    roles: [UserType.ADMIN],
    // permissions: ['delete:user'],
    rateLimit: { points: 5, duration: 300 }, // 5 deletes per 5 minutes
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role (Admin only)' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleService.delete(id);
  }
}
