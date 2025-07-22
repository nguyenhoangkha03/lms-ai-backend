export {};

declare global {
  namespace Express {
    interface Request {
      //   user?: User;
      privacyContext?: {
        canTrackActivity: boolean;
        canCollectAnalytics: boolean;
        canShareData: boolean;
        cookiePreferences: any;
      };
    }
  }
}
