import * as nodemailer from 'nodemailer';

async function sendTestEmail() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: 'akaisui03@gmail.com',
      pass: 'hjgtkuredzaylggw', // App password từ Gmail
    },
  });

  const mailOptions = {
    from: 'LMS AI Platform <akaisui03@gmail.com>',
    to: 'momota19102003@gmail.com', // Email người nhận cụ thể
    subject: '🧪 Test gửi email từ hệ thống LMS',
    text: 'Đây là email test được gửi bằng nodemailer!',
    html: `<p>✅ Đây là email test được gửi từ <strong>LMS AI</strong> bằng <code>nodemailer</code>.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

sendTestEmail();

// npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate src/database/migrations/CreateWishlist -d src/database/data-source.ts
