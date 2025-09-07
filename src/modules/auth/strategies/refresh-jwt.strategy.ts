import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/modules/user/services/user.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => {
          return request?.cookies?.['refresh-token'];
        },
        (request: any) => request?.body?.refreshToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true, // thì hàm validate() sẽ nhận thêm request
    });
  }

  async validate(request: any, payload: JwtPayload): Promise<any> {
    const refreshToken =
      request?.cookies?.['refresh-token'] ||
      request?.headers?.authorization?.replace('Bearer ', '');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify refresh token in database
    const isValidRefreshToken = await this.userService.verifyRefreshToken(user.id, refreshToken);

    if (!isValidRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return user;
  }
}
