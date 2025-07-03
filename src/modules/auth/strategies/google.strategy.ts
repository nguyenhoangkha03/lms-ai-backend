import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { UserService } from '@/modules/user/services/user.service';

export interface GoogleProfile {
  id: string;
  emails: { value: string; verified: boolean }[];
  name: { familyName: string; givenName: string };
  photos: { value: string }[];
  provider: string;
  _raw: string;
  _json: any;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.get<string>('oauth.google.clientId'),
      clientSecret: configService.get<string>('oauth.google.clientSecret'),
      callbackURL: configService.get<string>('oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { emails, name, photos, id } = profile;
      const email = emails[0]?.value;

      if (!email) {
        return done(new Error('No email found in Google profile'), null);
      }

      // Check if user exists with this email
      let user = await this.userService.findByEmail(email);

      if (user) {
        // Link Google account if not already linked
        await this.userService.linkOAuthAccount(user.id, {
          provider: 'google',
          providerId: id,
          accessToken,
          refreshToken,
          profileData: {
            name: `${name.givenName} ${name.familyName}`,
            avatar: photos[0]?.value,
          },
        });
      } else {
        // Create new user with Google account
        user = await this.userService.createOAuthUser({
          email,
          firstName: name.givenName,
          lastName: name.familyName,
          avatarUrl: photos[0]?.value,
          userType: 'student',
          emailVerified: true, // Google emails are pre-verified
          oauthProvider: 'google',
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
        provider: 'google',
      };
    } catch (error) {
      return done(error, null);
    }
  }
}
