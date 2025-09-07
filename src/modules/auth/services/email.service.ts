import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as AWS from 'aws-sdk';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private sesClient?: AWS.SES;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailProvider = this.configService.get('EMAIL_PROVIDER', 'smtp');

    if (emailProvider === 'ses') {
      this.initializeSES();
    } else {
      this.initializeSMTP();
    }
  }

  private initializeSES() {
    this.sesClient = new AWS.SES({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    });
  }

  private initializeSMTP() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT')) || 587,
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    try {
      const verificationUrl = `${this.configService.get<string>('frontend.url')}/verify-email?token=${token}`;

      const subject = 'Verify your email address';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Email Verification</h2>
            <p>Hello,</p>
            <p>Thank you for registering an account. To complete the registration process, please click the link below to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
                style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email
            </a>
            </div>
            <p>Or copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p><strong>Note:</strong> This link will expire in 24 hours.</p>
            <p>If you did not create this account, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666; text-align: center;">
            This is an automated message, please do not reply.
            </p>
        </div>
        `;

      const textBody = `
        Email Verification

        Hello,

        Thank you for registering an account. To complete the registration process, please visit the following link to verify your email address:

        ${verificationUrl}

        Note: This link will expire in 24 hours.

        If you did not create this account, please ignore this email.
    `;

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM_ADDRESS'),
        to: email,
        subject,
        text: textBody,
        html: htmlBody,
      };

      if (this.sesClient) {
        await this.sendViaSES(mailOptions);
      } else {
        await this.transporter.sendMail(mailOptions);
      }

      this.logger.log(`Verification email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    try {
      const resetUrl = `${this.configService.get<string>('frontend.url')}/reset-password?token=${token}`;

      const subject = 'Đặt lại mật khẩu';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Đặt lại mật khẩu</h2>
          <p>Chào bạn,</p>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào liên kết bên dưới để đặt lại mật khẩu:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p>Hoặc copy và paste liên kết sau vào trình duyệt:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 15 phút.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            Email này được gửi tự động, vui lòng không trả lời.
          </p>
        </div>
      `;

      const textBody = `
        Đặt lại mật khẩu

        Chào bạn,

        Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Truy cập liên kết sau để đặt lại mật khẩu:

        ${resetUrl}

        Lưu ý: Liên kết này sẽ hết hạn sau 15 phút.

        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
      `;

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM_ADDRESS'),
        to: email,
        subject,
        text: textBody,
        html: htmlBody,
      };

      if (this.sesClient) {
        await this.sendViaSES(mailOptions);
      } else {
        await this.transporter.sendMail(mailOptions);
      }

      this.logger.log(`Password reset email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }

  private async sendViaSES(mailOptions: any): Promise<void> {
    const params = {
      Source: mailOptions.from,
      Destination: {
        ToAddresses: [mailOptions.to],
      },
      Message: {
        Subject: {
          Data: mailOptions.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: mailOptions.text,
            Charset: 'UTF-8',
          },
          Html: {
            Data: mailOptions.html,
            Charset: 'UTF-8',
          },
        },
      },
    };

    await this.sesClient!.sendEmail(params).promise();
  }

  async sendTeacherApplicationVerificationEmail(
    email: string,
    token: string,
    teacherInfo: { firstName: string; lastName: string },
  ): Promise<boolean> {
    try {
      const verificationUrl = `${this.configService.get<string>('backend.url', 'http://localhost:3001')}/api/v1/auth/verify-email?token=${token}`;

      const subject = 'Verify your email - Teacher Application';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Welcome to our Teaching Platform!</h2>
          <p>Hello ${teacherInfo.firstName} ${teacherInfo.lastName},</p>
          <p>Thank you for applying to become a teacher on our platform. To complete your application, please verify your email address by clicking the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email & Complete Application
            </a>
          </div>
          <p>Or copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p><strong>What happens next?</strong></p>
          <ol>
            <li>Click the verification link above</li>
            <li>Your application will be reviewed by our admin team</li>
            <li>You'll receive an email notification about the approval status</li>
            <li>Once approved, you can start creating and teaching courses</li>
          </ol>
          <p><strong>Note:</strong> This link will expire in 24 hours.</p>
          <p>If you did not apply to be a teacher, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `;

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM_ADDRESS'),
        to: email,
        subject,
        html: htmlBody,
      };

      if (this.sesClient) {
        await this.sendViaSES(mailOptions);
      } else {
        await this.transporter.sendMail(mailOptions);
      }

      this.logger.log(`Teacher verification email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send teacher verification email to ${email}:`, error);
      return false;
    }
  }

  async sendTeacherApprovalEmail(
    email: string,
    teacherInfo: { firstName: string; lastName: string; teacherCode: string; approvalNotes?: string },
  ): Promise<boolean> {
    try {
      const subject = 'Congratulations! Your Teacher Application has been Approved';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745; text-align: center;">🎉 Application Approved!</h2>
          <p>Dear ${teacherInfo.firstName} ${teacherInfo.lastName},</p>
          <p>We are excited to inform you that your teacher application has been <strong>approved</strong>!</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Teacher Details:</h3>
            <p><strong>Teacher ID:</strong> ${teacherInfo.teacherCode}</p>
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">APPROVED</span></p>
          </div>

          ${teacherInfo.approvalNotes ? `
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #0066cc;">Admin Notes:</h4>
            <p style="margin-bottom: 0;">${teacherInfo.approvalNotes}</p>
          </div>
          ` : ''}

          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Log into your account using your credentials</li>
            <li>Complete your teacher profile if needed</li>
            <li>Start creating your first course</li>
            <li>Begin teaching and inspiring students!</li>
          </ol>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('frontend.url')}/teacher/dashboard" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Teacher Dashboard
            </a>
          </div>

          <p>Welcome to our teaching community! We look forward to the amazing courses you'll create.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `;

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM_ADDRESS'),
        to: email,
        subject,
        html: htmlBody,
      };

      if (this.sesClient) {
        await this.sendViaSES(mailOptions);
      } else {
        await this.transporter.sendMail(mailOptions);
      }

      this.logger.log(`Teacher approval email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send teacher approval email to ${email}:`, error);
      return false;
    }
  }

  async sendTeacherRejectionEmail(
    email: string,
    teacherInfo: { firstName: string; lastName: string; rejectionReason?: string },
  ): Promise<boolean> {
    try {
      const subject = 'Update on Your Teacher Application';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545; text-align: center;">Teacher Application Update</h2>
          <p>Dear ${teacherInfo.firstName} ${teacherInfo.lastName},</p>
          <p>Thank you for your interest in becoming a teacher on our platform. After careful review of your application, we regret to inform you that we are unable to approve your application at this time.</p>
          
          ${teacherInfo.rejectionReason ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">Feedback:</h4>
            <p style="margin-bottom: 0;">${teacherInfo.rejectionReason}</p>
          </div>
          ` : ''}

          <p><strong>What you can do:</strong></p>
          <ul>
            <li>Review the feedback provided above (if any)</li>
            <li>Address any issues mentioned</li>
            <li>Gain additional experience or qualifications as needed</li>
            <li>Feel free to reapply in the future</li>
          </ul>

          <p>We encourage you to reapply once you've addressed the areas mentioned in the feedback. Our platform is always looking for qualified and passionate teachers.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('frontend.url')}/teacher/apply" 
               style="background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Apply Again Later
            </a>
          </div>

          <p>Thank you for your understanding, and we appreciate your interest in our platform.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            If you have questions about this decision, please contact our support team.
          </p>
        </div>
      `;

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM_ADDRESS'),
        to: email,
        subject,
        html: htmlBody,
      };

      if (this.sesClient) {
        await this.sendViaSES(mailOptions);
      } else {
        await this.transporter.sendMail(mailOptions);
      }

      this.logger.log(`Teacher rejection email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send teacher rejection email to ${email}:`, error);
      return false;
    }
  }

  async sendTeacherInfoRequestEmail(
    email: string,
    requestInfo: {
      firstName: string;
      lastName: string;
      message: string;
      requiredDocuments?: string[];
      dueDate?: Date;
    },
  ): Promise<boolean> {
    try {
      const subject = 'Additional Information Required - Teacher Application';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ffc107; text-align: center;">Additional Information Required</h2>
          <p>Dear ${requestInfo.firstName} ${requestInfo.lastName},</p>
          <p>We are reviewing your teacher application and need some additional information to proceed with the evaluation process.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">Request Details:</h4>
            <p style="margin-bottom: 0;">${requestInfo.message}</p>
          </div>

          ${requestInfo.requiredDocuments && requestInfo.requiredDocuments.length > 0 ? `
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #0066cc;">Required Documents:</h4>
            <ul>
              ${requestInfo.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${requestInfo.dueDate ? `
          <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #c62828;">Response Due Date:</h4>
            <p style="margin-bottom: 0; font-weight: bold;">${requestInfo.dueDate.toLocaleDateString()}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('frontend.url')}/teacher/application" 
               style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Update Application
            </a>
          </div>

          <p>Please provide the requested information as soon as possible to continue the review process.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            If you have questions, please contact our support team.
          </p>
        </div>
      `;

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM_ADDRESS'),
        to: email,
        subject,
        html: htmlBody,
      };

      if (this.sesClient) {
        await this.sendViaSES(mailOptions);
      } else {
        await this.transporter.sendMail(mailOptions);
      }

      this.logger.log(`Teacher info request email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send teacher info request email to ${email}:`, error);
      return false;
    }
  }

  async verifyEmailConfiguration(): Promise<boolean> {
    try {
      if (this.sesClient) {
        const fromEmail = this.configService.get('EMAIL_FROM_ADDRESS');
        if (!fromEmail) throw new Error('EMAIL_FROM_ADDRESS is not set in config');

        await this.sesClient
          .getIdentityVerificationAttributes({
            Identities: [fromEmail],
          })
          .promise();

        return true;
      } else {
        await this.transporter.verify();
        return true;
      }
    } catch (error) {
      this.logger.error('Email configuration verification failed:', error);
      return false;
    }
  }
}
