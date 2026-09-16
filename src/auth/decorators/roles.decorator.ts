import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

// Constant key used for storing role-based metadata.
export const ROLES_KEY = 'roles';

/**
 * Custom decorator for specifying the roles allowed to access a route or controller.
 * Utilizes the 'roles' key to attach metadata to handlers.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
