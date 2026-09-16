import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Authorization Guard for Role-Based Access Control (RBAC).
 * Compares the roles required by the @Roles decorator with the role of the current user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Evaluates if the current request can proceed based on user roles.
   */
  canActivate(context: ExecutionContext): boolean {
    // Extract metadata for the 'roles' key from the target handler or class.
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific roles are required, access is granted by default.
    if (!requiredRoles) {
      return true;
    }

    // Retrieve the user from the request (attached by JwtStrategy).
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Access Denied: No authenticated user found in request.');
    }

    // Check if the user has at least one of the required roles.
    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException(
        `Access Denied: Your role '${user.role}' does not have permission to access this resource. Required roles: [${requiredRoles.join(', ')}]`
      );
    }

    return true;
  }
}
