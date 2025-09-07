import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { PaymentService } from './services/payment.service';
import { MomoService } from './services/momo.service';
import { StripeService } from './services/stripe.service';
import { PaymentController } from './controllers/payment.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { Cart } from '../course/entities/cart.entity';
import { Course } from '../course/entities/course.entity';
import { User } from '../user/entities/user.entity';
import { Enrollment } from '../course/entities/enrollment.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([
      Payment,
      PaymentItem,
      Cart,
      Course,
      User,
      Enrollment,
    ]),
  ],
  controllers: [PaymentController, StripeWebhookController],
  providers: [
    PaymentService,
    MomoService,
    StripeService,
  ],
  exports: [
    PaymentService,
    MomoService,
    StripeService,
  ],
})
export class PaymentModule {}