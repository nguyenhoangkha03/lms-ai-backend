export interface OAuthProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
}

export interface OAuthAccountLink {
  provider: 'google' | 'facebook';
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  profileData: {
    name: string;
    avatar?: string;
  };
}

export interface CreateOAuthUserDto {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  userType: 'student' | 'teacher' | 'admin';
  emailVerified: boolean;
  oauthProvider: 'google' | 'facebook';
  oauthProviderId: string;
  oauthData: {
    accessToken: string;
    refreshToken?: string;
  };
}
