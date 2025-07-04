import { SetMetadata } from '@nestjs/common';
import { ResourceDefinition } from '../guards/resource.guard';

export const RESOURCE_KEY = 'resource';
export const Resource = (definition: ResourceDefinition) => SetMetadata(RESOURCE_KEY, definition);
