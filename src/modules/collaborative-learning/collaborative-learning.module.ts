import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Entities
import { StudyGroup } from './entities/study-group.entity';
import { StudyGroupMember } from './entities/study-group-member.entity';
import { SharedWhiteboard } from './entities/shared-whiteboard.entity';
import { WhiteboardElement } from './entities/whiteboard-element.entity';
import { CollaborativeNote } from './entities/collaborative-note.entity';
import { NoteCollaborator } from './entities/note-collaborator.entity';
import { PeerReview } from './entities/peer-review.entity';
import { PeerReviewSubmission } from './entities/peer-review-submission.entity';
import { PeerReviewFeedback } from './entities/peer-review-feedback.entity';
import { GroupProject } from './entities/group-project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectTask } from './entities/project-task.entity';

// Controllers
import { StudyGroupController } from './controllers/study-group.controller';
import { SharedWhiteboardController } from './controllers/shared-whiteboard.controller';
import { CollaborativeNoteController } from './controllers/collaborative-note.controller';
import { PeerReviewController } from './controllers/peer-review.controller';
import { GroupProjectController } from './controllers/group-project.controller';

// Services
import { StudyGroupService } from './services/study-group.service';
import { SharedWhiteboardService } from './services/shared-whiteboard.service';
import { CollaborativeNoteService } from './services/collaborative-note.service';
import { PeerReviewService } from './services/peer-review.service';
import { GroupProjectService } from './services/group-project.service';

// External modules
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Study Group entities
      StudyGroup,
      StudyGroupMember,

      // Whiteboard entities
      SharedWhiteboard,
      WhiteboardElement,

      // Note entities
      CollaborativeNote,
      NoteCollaborator,

      // Peer Review entities
      PeerReview,
      PeerReviewSubmission,
      PeerReviewFeedback,

      // Project entities
      GroupProject,
      ProjectMember,
      ProjectTask,
    ]),
    BullModule.registerQueue(
      { name: 'collaborative-notifications' },
      { name: 'peer-review-assignments' },
      { name: 'project-analytics' },
    ),
    UserModule,
    CourseModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [
    StudyGroupController,
    SharedWhiteboardController,
    CollaborativeNoteController,
    PeerReviewController,
    GroupProjectController,
  ],
  providers: [
    StudyGroupService,
    PeerReviewService,
    GroupProjectService,
    SharedWhiteboardService,
    CollaborativeNoteService,
  ],
  exports: [
    TypeOrmModule,
    StudyGroupService,
    SharedWhiteboardService,
    CollaborativeNoteService,
    PeerReviewService,
    GroupProjectService,
  ],
})
export class CollaborativeLearningModule {}
