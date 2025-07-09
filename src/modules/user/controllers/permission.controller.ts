import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WinstonService } from '@/logger/winston.service';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserType } from '@/common/enums/user.enums';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { Permissions } from '@/modules/auth/decorators/permissions.decorator';
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
  @UseGuards(PermissionsGuard)
  @Permissions('read:permission')
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

  @Get('resource/:resource')
  @UseGuards(PermissionsGuard)
  @Permissions('read:permission')
  @ApiOperation({ summary: 'Get permissions by resource' })
  @ApiParam({ name: 'resource', description: 'Permission resource' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async findByResource(@Param('resource') resource: any) {
    return this.permissionService.findByResource(resource);
  }
}
