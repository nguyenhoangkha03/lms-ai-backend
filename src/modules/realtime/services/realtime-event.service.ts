import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { RealtimeEvent, EventType, EventScope } from '../entities/realtime-event.entity';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { NotificationService } from '../../notification/services/notification.service';
import { CreateEventDto, EventFilters } from '../dto/realtime.dto';

@Injectable()
export class RealtimeEventService {
  private readonly logger = new Logger(RealtimeEventService.name);

  constructor(
    @InjectRepository(RealtimeEvent)
    private eventRepository: Repository<RealtimeEvent>,

    @InjectQueue('realtime-events')
    private eventQueue: Queue,

    private notificationService: NotificationService,
  ) {}

  async createEvent(createEventDto: CreateEventDto): Promise<RealtimeEvent> {
    const event = this.eventRepository.create({
      ...createEventDto,
      channels: createEventDto.channels || {
        websocket: true,
        push: false,
        email: false,
        sms: false,
        inApp: true,
      },
    });

    const savedEvent = await this.eventRepository.save(event);

    // Queue event for immediate broadcasting
    await this.eventQueue.add(
      'broadcast-event',
      {
        eventId: savedEvent.id,
      },
      {
        priority: savedEvent.priority,
      },
    );

    this.logger.log(`Real-time event created: ${savedEvent.eventType} (${savedEvent.id})`);
    return savedEvent;
  }

  async broadcastEvent(eventId: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event || !event.isActive) {
      return;
    }

    try {
      // Get the gateway instance and broadcast
      const gateway = this.getGatewayInstance();
      if (gateway) {
        await gateway.broadcastEvent(event);
      }

      // Create notifications if enabled
      if (event.channels?.inApp || event.channels?.push || event.channels?.email) {
        await this.createNotifications(event);
      }

      // Update event statistics
      await this.updateEventStats(eventId, 'broadcast');
    } catch (error) {
      this.logger.error(`Failed to broadcast event ${eventId}:`, error);

      // Update delivery status with error
      await this.updateDeliveryStatus(eventId, {
        websocket: { sent: false, error: error.message, timestamp: new Date() },
      });
    }
  }

  async getChannelEvents(
    channel: string,
    options: {
      limit?: number;
      offset?: number;
      filters?: EventFilters;
      since?: Date;
    } = {},
  ): Promise<RealtimeEvent[]> {
    const { limit = 50, offset = 0, filters, since } = options;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.isActive = :isActive', { isActive: true })
      .orderBy('event.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    // Parse channel to determine scope and targetId
    const [scope, targetId] = channel.split(':');

    if (scope && targetId) {
      queryBuilder.andWhere('event.scope = :scope', { scope });
      queryBuilder.andWhere('event.targetId = :targetId', { targetId });
    } else if (channel === 'global') {
      queryBuilder.andWhere('event.scope = :scope', { scope: EventScope.GLOBAL });
    }

    // Apply filters
    if (filters) {
      if (filters.eventTypes?.length) {
        queryBuilder.andWhere('event.eventType IN (:...eventTypes)', {
          eventTypes: filters.eventTypes,
        });
      }

      if (filters.priority?.length) {
        queryBuilder.andWhere('event.priority IN (:...priority)', {
          priority: filters.priority,
        });
      }

      if (filters.tags?.length) {
        queryBuilder.andWhere('JSON_CONTAINS(event.tags, :tags)', {
          tags: JSON.stringify(filters.tags),
        });
      }
    }

    // Apply time filter
    if (since) {
      queryBuilder.andWhere('event.createdAt >= :since', { since });
    }

    return await queryBuilder.getMany();
  }

  async getUserEvents(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      eventTypes?: EventType[];
      since?: Date;
    } = {},
  ): Promise<RealtimeEvent[]> {
    const { limit = 50, offset = 0, eventTypes, since } = options;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.isActive = :isActive', { isActive: true })
      .andWhere(
        '(event.scope = :userScope AND event.targetId = :userId) OR event.scope = :globalScope',
        {
          userScope: EventScope.USER,
          userId,
          globalScope: EventScope.GLOBAL,
        },
      )
      .orderBy('event.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (eventTypes?.length) {
      queryBuilder.andWhere('event.eventType IN (:...eventTypes)', { eventTypes });
    }

    if (since) {
      queryBuilder.andWhere('event.createdAt >= :since', { since });
    }

    return await queryBuilder.getMany();
  }

  async updateDeliveryStatus(eventId: string, status: any): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) return;

    const currentStatus = event.deliveryStatus || {};
    const updatedStatus = { ...currentStatus, ...status };

    await this.eventRepository.update(eventId, {
      deliveryStatus: updatedStatus,
    });
  }

  async updateEventStats(eventId: string, action: 'broadcast' | 'interaction'): Promise<void> {
    const updateData: any = {};

    if (action === 'broadcast') {
      updateData.reachCount = () => 'reachCount + 1';
    } else if (action === 'interaction') {
      updateData.interactionCount = () => 'interactionCount + 1';
    }

    await this.eventRepository.update(eventId, updateData);
  }

  async getEventAnalytics(
    dateRange: { startDate: Date; endDate: Date },
    filters?: {
      eventTypes?: EventType[];
      scopes?: EventScope[];
      triggeredBy?: string;
    },
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByScope: Record<string, number>;
    avgReachPerEvent: number;
    avgInteractionRate: number;
    topPerformingEvents: RealtimeEvent[];
  }> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

    if (filters) {
      if (filters.eventTypes?.length) {
        queryBuilder.andWhere('event.eventType IN (:...eventTypes)', {
          eventTypes: filters.eventTypes,
        });
      }

      if (filters.scopes?.length) {
        queryBuilder.andWhere('event.scope IN (:...scopes)', {
          scopes: filters.scopes,
        });
      }

      if (filters.triggeredBy) {
        queryBuilder.andWhere('event.triggeredBy = :triggeredBy', {
          triggeredBy: filters.triggeredBy,
        });
      }
    }

    const events = await queryBuilder.getMany();

    const analytics = {
      totalEvents: events.length,
      eventsByType: this.groupByField(events, 'eventType'),
      eventsByScope: this.groupByField(events, 'scope'),
      avgReachPerEvent: this.calculateAverage(events, 'reachCount'),
      avgInteractionRate: this.calculateInteractionRate(events),
      topPerformingEvents: events
        .sort((a, b) => b.interactionCount - a.interactionCount)
        .slice(0, 10),
    };

    return analytics;
  }

  async createBulkEvents(events: CreateEventDto[]): Promise<RealtimeEvent[]> {
    const eventEntities = events.map(dto => this.eventRepository.create(dto));
    const savedEvents = await this.eventRepository.save(eventEntities);

    // Queue all events for broadcasting
    const jobs = savedEvents.map(event => ({
      name: 'broadcast-event',
      data: { eventId: event.id },
      opts: { priority: event.priority },
    }));

    await this.eventQueue.addBulk(jobs);

    this.logger.log(`Created ${savedEvents.length} bulk events`);
    return savedEvents;
  }

  async scheduleEvent(createEventDto: CreateEventDto, scheduleAt: Date): Promise<RealtimeEvent> {
    const event = await this.createEvent(createEventDto);

    // Schedule the event for future broadcasting
    const delay = scheduleAt.getTime() - Date.now();

    await this.eventQueue.add(
      'broadcast-event',
      {
        eventId: event.id,
      },
      {
        delay: Math.max(0, delay),
        priority: event.priority,
      },
    );

    this.logger.log(`Event scheduled for ${scheduleAt.toISOString()}: ${event.eventType}`);
    return event;
  }

  async cancelEvent(eventId: string): Promise<void> {
    await this.eventRepository.update(eventId, { isActive: false });

    // Remove pending jobs from queue
    const jobs = await this.eventQueue.getJobs(['delayed', 'waiting']);
    for (const job of jobs) {
      if (job.data.eventId === eventId) {
        await job.remove();
      }
    }

    this.logger.log(`Event cancelled: ${eventId}`);
  }

  async expireOldEvents(olderThan: Date): Promise<number> {
    const result = await this.eventRepository.update(
      {
        createdAt: Between(new Date('1970-01-01'), olderThan),
        isActive: true,
      },
      { isActive: false },
    );

    const expiredCount = result.affected || 0;
    this.logger.log(`Expired ${expiredCount} old events`);

    return expiredCount;
  }

  private async createNotifications(event: RealtimeEvent): Promise<void> {
    try {
      if (event.scope === EventScope.USER && event.targetId) {
        // Create individual notification
        await this.notificationService.create({
          userId: event.targetId,
          title: event.title,
          message: event.message || '',
          type: this.mapEventTypeToNotificationType(event.eventType),
          category: 'realtime' as any,
          actionUrl: event.actionUrl,
          iconUrl: event.iconUrl,
          priority: this.mapPriorityToNotificationPriority(event.priority),
          relatedId: event.id,
          relatedType: 'realtime_event',
        });
      }
      // Additional notification logic for other scopes would go here
    } catch (error) {
      this.logger.error(`Failed to create notifications for event ${event.id}:`, error);
    }
  }

  private mapEventTypeToNotificationType(eventType: EventType): any {
    // Map event types to notification types
    const mapping = {
      [EventType.LESSON_COMPLETED]: 'course_progress',
      [EventType.GRADE_RECEIVED]: 'grade_update',
      [EventType.NEW_MESSAGE]: 'new_message',
      [EventType.SYSTEM_NOTIFICATION]: 'system_update',
      // Add more mappings as needed
    };

    return mapping[eventType] || 'general';
  }

  private mapPriorityToNotificationPriority(priority: number): any {
    if (priority >= 4) return 'urgent';
    if (priority >= 3) return 'high';
    if (priority >= 2) return 'normal';
    return 'low';
  }

  private groupByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAverage(items: any[], field: string): number {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item[field] || 0), 0);
    return sum / items.length;
  }

  private calculateInteractionRate(events: RealtimeEvent[]): number {
    const totalReach = events.reduce((acc, event) => acc + event.reachCount, 0);
    const totalInteractions = events.reduce((acc, event) => acc + event.interactionCount, 0);

    return totalReach > 0 ? (totalInteractions / totalReach) * 100 : 0;
  }

  private getGatewayInstance(): RealtimeGateway | null {
    // This would need to be injected properly in a real implementation
    // For now, returning null as placeholder
    return null;
  }
}
