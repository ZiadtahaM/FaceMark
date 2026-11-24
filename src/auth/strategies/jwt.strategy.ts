import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Passport strategy for validating JSON Web Tokens (JWT).
 * Extracted from the Authorization header as a Bearer token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    // Configures the strategy with the secret key and extraction method.
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(configService),
    });
  }

  /**
   * Validates the decoded JWT payload.
   * If validation passes, the returned object is attached to the request as 'user'.
   */
  async validate(payload: JwtPayload) {
    // Construct the user object from the token's claims.
    // We provide both names for compatibility across the codebase.
    return { 
      userAccountId: payload.sub,
      userId: payload.sub, 
      username: payload.username, 
      userType: payload.role,
      role: payload.role 
    };
  }
}


function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}
