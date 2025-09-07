import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@/modules/notification/entities/notification.entity';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
} from '@/common/enums/notification.enums';

@Injectable()
export class NotificationSeeder {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async seed(): Promise<void> {
    // Check if data already exists
    const existingNotifications = await this.notificationRepository.count();
    if (existingNotifications > 0) {
      console.log('Notifications already exist, skipping seeding...');
      return;
    }

    console.log('Seeding notifications...');

    const userId = '1a6b4a1b-8fb9-4e52-b5a2-400c9555c1fc';
    
    const notificationsData = [
      {
        userId,
        title: 'Chào mừng bạn đến với Learnary! 🎉',
        message: 'Chúc mừng bạn đã tạo tài khoản thành công! Hãy khám phá hàng ngàn khóa học chất lượng cao và bắt đầu hành trình học tập của bạn ngay hôm nay.',
        type: NotificationType.ANNOUNCEMENT,
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.HIGH,
        isRead: false,
        actionUrl: '/student/dashboard',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828640.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date() }
        },
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: {
          welcomeNotification: true,
          source: 'registration_flow'
        }
      },
      {
        userId,
        title: 'Khóa học "JavaScript Fundamentals" đã có bài học mới!',
        message: 'Bài học "Async/Await và Promises" vừa được thêm vào khóa học JavaScript Fundamentals. Hãy tiếp tục học để hoàn thành chương trình nhé!',
        type: NotificationType.LESSON_AVAILABLE,
        category: NotificationCategory.ACADEMIC,
        priority: NotificationPriority.NORMAL,
        isRead: false,
        relatedId: 'lesson-123',
        relatedType: 'lesson',
        actionUrl: '/student/courses/javascript-fundamentals/lessons/async-await',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/5968/5968292.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date() }
        },
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: {
          courseId: 'course-456',
          courseName: 'JavaScript Fundamentals',
          lessonNumber: 8
        }
      },
      {
        userId,
        title: 'Bài tập "React Components" sắp hết hạn nộp',
        message: 'Bài tập React Components trong khóa học React Development sẽ hết hạn nộp vào 23:59 ngày mai. Hãy hoàn thành và nộp bài ngay để không bị trừ điểm nhé!',
        type: NotificationType.ASSIGNMENT_DUE,
        category: NotificationCategory.ACADEMIC,
        priority: NotificationPriority.HIGH,
        isRead: false,
        relatedId: 'assignment-789',
        relatedType: 'assignment',
        actionUrl: '/student/assignments/react-components',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2593/2593635.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date() }
        },
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: {
          courseId: 'course-789',
          courseName: 'React Development',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        }
      },
      {
        userId,
        title: 'Điểm bài kiểm tra "HTML & CSS Basics" đã có!',
        message: 'Bạn đã đạt 85/100 điểm trong bài kiểm tra HTML & CSS Basics. Tuyệt vời! Hãy xem chi tiết kết quả và feedback từ giảng viên.',
        type: NotificationType.GRADE_POSTED,
        category: NotificationCategory.ACADEMIC,
        priority: NotificationPriority.NORMAL,
        isRead: true,
        readAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        relatedId: 'quiz-456',
        relatedType: 'quiz',
        actionUrl: '/student/grades/html-css-basics-quiz',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date(Date.now() - 3 * 60 * 60 * 1000) }
        },
        tracking: {
          impressions: 1,
          clicks: 1,
          opens: 1,
          conversions: 1,
        },
        metadata: {
          score: 85,
          maxScore: 100,
          courseId: 'course-123',
          courseName: 'Web Development Basics'
        }
      },
      {
        userId,
        title: 'Buổi học trực tuyến "Advanced Python" bắt đầu sau 30 phút',
        message: 'Buổi học trực tuyến về "Data Structures & Algorithms in Python" sẽ bắt đầu lúc 19:30. Hãy chuẩn bị sẵn sàng và tham gia đúng giờ nhé!',
        type: NotificationType.VIDEO_SESSION_STARTING,
        category: NotificationCategory.VIDEO_SESSION,
        priority: NotificationPriority.HIGH,
        isRead: false,
        relatedId: 'session-789',
        relatedType: 'video_session',
        actionUrl: '/student/live-sessions/advanced-python-algorithms',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2111/2111738.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date() }
        },
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: {
          sessionTime: new Date(Date.now() + 30 * 60 * 1000), // In 30 minutes
          instructor: 'Dr. Nguyễn Văn Minh',
          courseId: 'course-python-advanced'
        }
      },
      {
        userId,
        title: 'Có tin nhắn mới từ giảng viên Trần Thị Lan',
        message: 'Giảng viên Trần Thị Lan vừa gửi tin nhắn cho bạn về dự án cuối khóa. Hãy kiểm tra và phản hồi sớm nhất có thể.',
        type: NotificationType.MESSAGE_RECEIVED,
        category: NotificationCategory.SOCIAL,
        priority: NotificationPriority.NORMAL,
        isRead: false,
        relatedId: 'message-123',
        relatedType: 'message',
        actionUrl: '/student/messages/instructor-tran-thi-lan',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/732/732200.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date() }
        },
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: {
          senderId: 'instructor-456',
          senderName: 'Trần Thị Lan',
          messagePreview: 'Chào bạn, tôi muốn thảo luận về dự án cuối khóa...'
        }
      },
      {
        userId,
        title: 'Nhắc nhở: Đã 2 ngày bạn chưa học!',
        message: 'Bạn đã không học bài từ 2 ngày trước. Hãy dành ít nhất 30 phút mỗi ngày để duy trì tiến độ học tập và đạt được mục tiêu của mình nhé!',
        type: NotificationType.REMINDER_STUDY,
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.MEDIUM,
        isRead: false,
        actionUrl: '/student/dashboard',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date() }
        },
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: {
          daysSinceLastStudy: 2,
          recommendedStudyTime: 30,
          motivationalMessage: true
        }
      },
      {
        userId,
        title: '🏆 Chúc mừng! Bạn đã hoàn thành khóa học "Git & GitHub"',
        message: 'Xuất sắc! Bạn đã hoàn thành 100% khóa học Git & GitHub. Chứng chỉ hoàn thành đã được cấp và có thể tải về từ hồ sơ của bạn.',
        type: NotificationType.COURSE_COMPLETED,
        category: NotificationCategory.ACADEMIC,
        priority: NotificationPriority.HIGH,
        isRead: false,
        relatedId: 'course-git-github',
        relatedType: 'course',
        actionUrl: '/student/certificates/git-github',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2010/2010990.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date() }
        },
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: {
          courseId: 'course-git-github',
          courseName: 'Git & GitHub',
          completionDate: new Date(),
          certificateId: 'cert-123456',
          completionPercentage: 100
        }
      },
      {
        userId,
        title: 'Bạn có lời mời tham gia nhóm học "React Study Group"',
        message: 'Bạn Nguyễn Văn An đã mời bạn tham gia nhóm học React Study Group. Nhóm hiện có 8 thành viên và họp mỗi thứ 7 hàng tuần.',
        type: NotificationType.STUDY_GROUP_INVITATION,
        category: NotificationCategory.SOCIAL,
        priority: NotificationPriority.NORMAL,
        isRead: false,
        relatedId: 'group-react-study',
        relatedType: 'study_group',
        actionUrl: '/student/study-groups/react-study-group/invitation',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1534/1534938.png',
        actions: [
          {
            id: 'accept',
            label: 'Chấp nhận',
            action: 'accept_invitation',
            url: '/api/study-groups/react-study-group/accept',
            style: 'primary' as const
          },
          {
            id: 'decline',
            label: 'Từ chối',
            action: 'decline_invitation',
            url: '/api/study-groups/react-study-group/decline',
            style: 'secondary' as const
          }
        ],
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date() }
        },
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: {
          groupId: 'group-react-study',
          groupName: 'React Study Group',
          inviterId: 'user-nguyen-van-an',
          inviterName: 'Nguyễn Văn An',
          memberCount: 8
        }
      },
      {
        userId,
        title: 'Bảo trì hệ thống: Learnary sẽ tạm ngưng hoạt động',
        message: 'Hệ thống sẽ bảo trì từ 02:00 - 04:00 sáng ngày mai để nâng cấp server. Trong thời gian này, bạn sẽ không thể truy cập vào nền tảng. Cảm ơn bạn đã thông cảm!',
        type: NotificationType.SYSTEM_MAINTENANCE,
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.MEDIUM,
        isRead: true,
        readAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        actionUrl: '/system/maintenance-info',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828506.png',
        deliveryStatus: {
          inApp: { sent: true, deliveredAt: new Date(Date.now() - 6 * 60 * 60 * 1000) }
        },
        tracking: {
          impressions: 1,
          clicks: 0,
          opens: 1,
          conversions: 0,
        },
        metadata: {
          maintenanceStart: new Date(Date.now() + 18 * 60 * 60 * 1000), // Tomorrow 2AM
          maintenanceEnd: new Date(Date.now() + 20 * 60 * 60 * 1000), // Tomorrow 4AM
          affectedServices: ['learning_platform', 'video_streaming', 'chat'],
          isScheduled: true
        }
      }
    ];

    // Create notifications
    const notifications = this.notificationRepository.create(notificationsData);
    await this.notificationRepository.save(notifications);

    console.log(`✅ Successfully seeded ${notifications.length} notifications`);
  }
}