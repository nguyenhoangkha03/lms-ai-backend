import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { CacheService } from '@/cache/cache.service';

interface ZoomMeetingConfig {
  topic: string;
  startTime: Date;
  duration: number; // in minutes
  settings?: any;
  password?: string;
}

interface ZoomMeeting {
  id: string;
  topic: string;
  joinUrl: string;
  password: string;
  startUrl: string;
  hostId: string;
}

@Injectable()
export class ZoomIntegrationService {
  private readonly logger = new Logger(ZoomIntegrationService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl = 'https://api.zoom.us/v2';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.apiKey = this.configService.get('ZOOM_API_KEY')!;
    this.apiSecret = this.configService.get('ZOOM_API_SECRET')!;
  }

  async createMeeting(config: ZoomMeetingConfig): Promise<ZoomMeeting> {
    try {
      const token = this.generateJWT();

      const meetingData = {
        topic: config.topic,
        type: 2, // Scheduled meeting
        start_time: config.startTime.toISOString(),
        duration: config.duration,
        timezone: 'UTC',
        password: config.password || this.generatePassword(),
        settings: {
          host_video: config.settings?.hostVideoOnEntry ?? true,
          participant_video: config.settings?.participantVideoOnEntry ?? false,
          cn_meeting: false,
          in_meeting: false,
          join_before_host: true,
          mute_upon_entry: config.settings?.muteParticipantsOnEntry ?? true,
          watermark: config.settings?.watermarkEnabled ?? false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          registration_type: 1,
          audio: 'both',
          auto_recording: config.settings?.autoStartRecording ? 'cloud' : 'none',
          enforce_login: false,
          waiting_room: config.settings?.waitingRoomEnabled ?? false,
          allow_multiple_devices: true,
          breakout_room: {
            enable: config.settings?.enableBreakoutRooms ?? false,
          },
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/users/me/meetings`, meetingData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const meeting = response.data;

      return {
        id: meeting.id.toString(),
        topic: meeting.topic,
        joinUrl: meeting.join_url,
        password: meeting.password,
        startUrl: meeting.start_url,
        hostId: meeting.host_id,
      };
    } catch (error) {
      this.logger.error(`Failed to create Zoom meeting: ${error.message}`);
      throw new BadRequestException('Failed to create Zoom meeting');
    }
  }

  async updateMeeting(meetingId: string, updates: any): Promise<void> {
    try {
      const token = this.generateJWT();

      const updateData = {
        topic: updates.topic,
        settings: {
          host_video: updates.settings?.hostVideoOnEntry,
          participant_video: updates.settings?.participantVideoOnEntry,
          mute_upon_entry: updates.settings?.muteParticipantsOnEntry,
          waiting_room: updates.settings?.waitingRoomEnabled,
          auto_recording: updates.settings?.autoStartRecording ? 'cloud' : 'none',
        },
      };

      await firstValueFrom(
        this.httpService.patch(`${this.baseUrl}/meetings/${meetingId}`, updateData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to update Zoom meeting: ${error.message}`);
      throw new BadRequestException('Failed to update Zoom meeting');
    }
  }

  async startMeeting(meetingId: string): Promise<void> {
    try {
      const token = this.generateJWT();

      await firstValueFrom(
        this.httpService.patch(
          `${this.baseUrl}/meetings/${meetingId}/status`,
          { action: 'start' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to start Zoom meeting: ${error.message}`);
      // Don't throw error as meeting might already be started
    }
  }

  async endMeeting(meetingId: string): Promise<void> {
    try {
      const token = this.generateJWT();

      await firstValueFrom(
        this.httpService.patch(
          `${this.baseUrl}/meetings/${meetingId}/status`,
          { action: 'end' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to end Zoom meeting: ${error.message}`);
      // Don't throw error as meeting might already be ended
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      const token = this.generateJWT();

      await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/meetings/${meetingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete Zoom meeting: ${error.message}`);
      throw new BadRequestException('Failed to delete Zoom meeting');
    }
  }

  async getJoinInfo(meetingId: string, _userId: string): Promise<any> {
    try {
      const token = this.generateJWT();

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/meetings/${meetingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      const meeting = response.data;

      return {
        joinUrl: meeting.join_url,
        meetingId: meeting.id,
        password: meeting.password,
        dialInNumbers: meeting.settings?.global_dial_in_numbers,
      };
    } catch (error) {
      this.logger.error(`Failed to get Zoom join info: ${error.message}`);
      throw new BadRequestException('Failed to get join information');
    }
  }

  async getRecordings(meetingId: string): Promise<any[]> {
    try {
      const token = this.generateJWT();

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/meetings/${meetingId}/recordings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      return response.data.recording_files || [];
    } catch (error) {
      this.logger.error(`Failed to get Zoom recordings: ${error.message}`);
      return [];
    }
  }

  async createBreakoutRooms(meetingId: string, rooms: any[]): Promise<void> {
    try {
      const token = this.generateJWT();

      const breakoutData = {
        type: 1, // Automatically assign participants
        rooms: rooms.map((room, index) => ({
          name: room.name || `Breakout Room ${index + 1}`,
          participants: room.participantIds?.map(id => ({ email: `user_${id}@temp.com` })) || [],
        })),
      };

      await firstValueFrom(
        this.httpService.patch(
          `${this.baseUrl}/meetings/${meetingId}/breakout_rooms`,
          breakoutData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to create Zoom breakout rooms: ${error.message}`);
      throw new BadRequestException('Failed to create breakout rooms');
    }
  }

  async getMeetingParticipants(meetingId: string): Promise<any[]> {
    try {
      const token = this.generateJWT();

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/meetings/${meetingId}/participants`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      return response.data.participants || [];
    } catch (error) {
      this.logger.error(`Failed to get Zoom participants: ${error.message}`);
      return [];
    }
  }

  private generateJWT(): string {
    const payload = {
      iss: this.apiKey,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    };

    return jwt.sign(payload, this.apiSecret);
  }

  private generatePassword(): string {
    return Math.random().toString(36).slice(-8);
  }
}
