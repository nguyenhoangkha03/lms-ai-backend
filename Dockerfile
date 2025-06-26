# Build stage
# container công cụ node:18 làm nền, alpine nhỏ gọn, tiết kiệm dung lượng
# đặt tên là builder
FROM node:18-alpine AS builder

# tạo một thư mục mục tên là app, mỗi lệnh sau sẽ thực thi ở đây
WORKDIR /app

# Copy package files
# copy vào
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
# npm ci sẽ cài đặt chính xác các gói thư viện được liệt kê trong package-lock.json
# --only=production chỉ cài đặt các gói cần thiết để chạy ứng dụng, không cài các gói cho việc phát triển (devDependencies)
RUN npm ci --only=production && npm cache clean --force

# Copy source code
# sao chép toàn bộ mã nguồn từ thư mục src của bạn vào xưởng
COPY src/ ./src/

# Build the application
# biên dịch code TypeScript thành code JavaScript và lưu vào thư mục dist
RUN npm run build

# Production stage
# bắt đầu lại từ đầu với một nền node:18-alpine hoàn toàn mới, sạch sẽ.
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
# cài đặt dumb-init. Đây là một trình quản lý tiến trình siêu nhẹ, giúp ứng dụng nhận và xử lý các tín hiệu hệ thống (như tín hiệu tắt máy) một cách chính xác.
RUN apk add --no-cache dumb-init

# Create app user
# tạo ra một người dùng mới không phải là root (quản trị viên cao nhất) tên là nestjs.
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application
# --chown=nestjs:nodejs: Giao quyền quyền sở hữu thư mục cho user nestjs và group nodejs
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs package*.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
# để định nghĩa cách Docker kiểm tra tình trạng “sức khỏe” của container (health check). Cụ thể, nó nói cho Docker biết khi nào container đang hoạt động ổn định, khi nào không.
# --start-period=5s cho phép container khởi động 5 giây đầu không bị kiểm tra
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/health-check.js

# Start the application
# lệnh khởi động cuối cùng.
# (dumb-init) sẽ là người khởi động mọi thứ
ENTRYPOINT ["dumb-init", "--"]
# công việc mặc định cho quản lý ca là chạy ứng dụng chính (node dist/main.js).
CMD ["node", "dist/main.js"] 