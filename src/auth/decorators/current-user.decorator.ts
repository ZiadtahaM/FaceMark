import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom parameter decorator for extracting the current user from the request object.
 * Returns the 'user' object attached by the JwtStrategy.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // Access the HTTP request object.
    const request = ctx.switchToHttp().getRequest();
    
    // Returns the user metadata stored in the request.
    return request.user;
  },
);
