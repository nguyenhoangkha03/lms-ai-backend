import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { UserService } from '@/modules/user/services/user.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.get<string>('oauth.facebook.clientId'),
      clientSecret: configService.get<string>('oauth.facebook.clientSecret'),
      callbackURL: configService.get<string>('oauth.facebook.callbackUrl'),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      const { emails, name, photos, id } = profile;
      const email = emails?.[0]?.value;

      if (!email) {
        return done(new Error('No email found in Facebook profile'), null);
      }

      // Check if user exists with this email
      let user = await this.userService.findByEmail(email);

      if (user) {
        // Link Facebook account if not already linked
        await this.userService.linkOAuthAccount(user.id, {
          provider: 'facebook',
          providerId: id,
          accessToken,
          refreshToken,
          profileData: {
            name: `${name?.givenName} ${name?.familyName}`,
            avatar: photos?.[0]?.value,
          },
        });
      } else {
        // Create new user with Facebook account
        user = await this.userService.createOAuthUser({
          email,
          firstName: name?.givenName || '',
          lastName: name?.familyName || '',
          avatarUrl: photos?.[0]?.value,
          userType: 'student',
          emailVerified: true, // Facebook emails are pre-verified
          oauthProvider: 'facebook',
          oauthProviderId: id,
          oauthData: {
            accessToken,
            refreshToken,
          },
        });
      }

      // Update last login
      await this.userService.updateLastLogin(user.id);

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        userType: user.userType,
        provider: 'facebook',
      };
    } catch (error) {
      return done(error, null);
    }
  }
}
