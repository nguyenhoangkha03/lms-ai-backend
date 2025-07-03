import { createHash } from 'crypto';

export class DeviceParserUtil {
  /**
   * Parse user agent string to extract device information
   */
  static parseUserAgent(userAgent: string): {
    device: string;
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
  } {
    if (!userAgent) {
      return {
        device: 'Unknown',
        browser: 'Unknown',
        browserVersion: 'Unknown',
        os: 'Unknown',
        osVersion: 'Unknown',
      };
    }

    const device = this.extractDevice(userAgent);
    const browser = this.extractBrowser(userAgent);
    const browserVersion = this.extractBrowserVersion(userAgent, browser);
    const os = this.extractOS(userAgent);
    const osVersion = this.extractOSVersion(userAgent, os);

    return { device, browser, browserVersion, os, osVersion };
  }

  private static extractDevice(userAgent: string): string {
    if (/iPad/.test(userAgent)) return 'iPad';
    if (/iPhone/.test(userAgent)) return 'iPhone';
    if (/Android.*Mobile/.test(userAgent)) return 'Android Phone';
    if (/Android/.test(userAgent)) return 'Android Tablet';
    if (/Windows Phone/.test(userAgent)) return 'Windows Phone';
    if (/Mobile/.test(userAgent)) return 'Mobile Device';
    if (/Tablet/.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }

  private static extractBrowser(userAgent: string): string {
    if (/Edg\//.test(userAgent)) return 'Edge';
    if (/Chrome\//.test(userAgent)) return 'Chrome';
    if (/Firefox\//.test(userAgent)) return 'Firefox';
    if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) return 'Safari';
    if (/Opera|OPR\//.test(userAgent)) return 'Opera';
    if (/MSIE|Trident/.test(userAgent)) return 'Internet Explorer';
    return 'Unknown';
  }

  private static extractBrowserVersion(userAgent: string, browser: string): string {
    let match: RegExpMatchArray | null = null;

    switch (browser) {
      case 'Chrome':
        match = userAgent.match(/Chrome\/(\d+\.?\d*)/);
        break;
      case 'Firefox':
        match = userAgent.match(/Firefox\/(\d+\.?\d*)/);
        break;
      case 'Safari':
        match = userAgent.match(/Version\/(\d+\.?\d*)/);
        break;
      case 'Edge':
        match = userAgent.match(/Edg\/(\d+\.?\d*)/);
        break;
      case 'Opera':
        match = userAgent.match(/(?:Opera|OPR)\/(\d+\.?\d*)/);
        break;
      default:
        return 'Unknown';
    }

    return match ? match[1] : 'Unknown';
  }

  private static extractOS(userAgent: string): string {
    if (/Windows NT 10/.test(userAgent)) return 'Windows 10';
    if (/Windows NT 6\.3/.test(userAgent)) return 'Windows 8.1';
    if (/Windows NT 6\.2/.test(userAgent)) return 'Windows 8';
    if (/Windows NT 6\.1/.test(userAgent)) return 'Windows 7';
    if (/Windows/.test(userAgent)) return 'Windows';
    if (/Mac OS X/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    if (/Android/.test(userAgent)) return 'Android';
    if (/iOS|iPhone|iPad/.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  private static extractOSVersion(userAgent: string, os: string): string {
    let match: RegExpMatchArray | null = null;

    switch (os) {
      case 'macOS':
        match = userAgent.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        return match ? match[1].replace(/_/g, '.') : 'Unknown';
      case 'iOS':
        match = userAgent.match(/OS (\d+[._]\d+[._]?\d*)/);
        return match ? match[1].replace(/_/g, '.') : 'Unknown';
      case 'Android':
        match = userAgent.match(/Android (\d+\.?\d*\.?\d*)/);
        return match ? match[1] : 'Unknown';
      case 'Windows 10':
      case 'Windows 8.1':
      case 'Windows 8':
      case 'Windows 7':
        return os.split(' ')[1];
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if device is mobile
   */
  static isMobile(userAgent: string): boolean {
    return /Mobile|Android|iPhone|iPad|Windows Phone/.test(userAgent);
  }

  /**
   * Check if device is tablet
   */
  static isTablet(userAgent: string): boolean {
    return /iPad|Android(?!.*Mobile)/.test(userAgent);
  }

  /**
   * Check if device is desktop
   */
  static isDesktop(userAgent: string): boolean {
    return !this.isMobile(userAgent) && !this.isTablet(userAgent);
  }

  /**
   * Generate device fingerprint for security purposes
   */
  static generateDeviceFingerprint(userAgent: string, ip: string): string {
    const deviceInfo = this.parseUserAgent(userAgent);

    const fingerprint = createHash('sha256')
      .update(`${deviceInfo.device}-${deviceInfo.browser}-${deviceInfo.os}-${ip}`)
      .digest('hex');

    return fingerprint.substring(0, 16); // First 16 characters
  }
}
