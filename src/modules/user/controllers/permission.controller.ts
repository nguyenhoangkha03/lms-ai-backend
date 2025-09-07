import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WinstonService } from '@/logger/winston.service';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserType } from '@/common/enums/user.enums';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { Permissions } from '@/modules/auth/decorators/permissions.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { PermissionService } from '../services/permission.service';

@ApiTags('Permission Management')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(PermissionController.name);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Create new permission (Admin only)' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  async create(@Body() createPermissionDto: any) {
    return this.permissionService.create(createPermissionDto);
  }

  @Get()
  @Public() // Temporary - remove after testing
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async findAll() {
    return this.permissionService.findAll();
  }

  @Get('category/:category')
  @UseGuards(PermissionsGuard)
  @Permissions('read:permission')
  @ApiOperation({ summary: 'Get permissions by category' })
  @ApiParam({ name: 'category', description: 'Permission category' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async findByCategory(@Param('category') category: string) {
    return this.permissionService.findByCategory(category);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('read:permission')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Update permission (Admin only)' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updatePermissionDto: any) {
    return this.permissionService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete permission (Admin only)' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 204, description: 'Permission deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.remove(id);
  }

  @Get('resource/:resource')
  @UseGuards(PermissionsGuard)
  @Permissions('read:permission')
  @ApiOperation({ summary: 'Get permissions by resource' })
  @ApiParam({ name: 'resource', description: 'Permission resource' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async findByResource(@Param('resource') resource: any) {
    return this.permissionService.findByResource(resource);
  }

  @Get('resources')
  @Public()
  @ApiOperation({ summary: 'Get all available permission resources' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  async getPermissionResources() {
    return this.permissionService.getAvailableResources();
  }

  @Get('actions')
  @Public()
  @ApiOperation({ summary: 'Get all available permission actions' })
  @ApiResponse({ status: 200, description: 'Actions retrieved successfully' })
  async getPermissionActions() {
    return this.permissionService.getAvailableActions();
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all permission categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getPermissionCategories() {
    return this.permissionService.getAvailableCategories();
  }
}
