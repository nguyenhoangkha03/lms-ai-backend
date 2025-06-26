-- Create development database
CREATE DATABASE IF NOT EXISTS lms_ai_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create test database
CREATE DATABASE IF NOT EXISTS lms_ai_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges
GRANT ALL PRIVILEGES ON lms_ai.* TO 'lms_user'@'%';
GRANT ALL PRIVILEGES ON lms_ai_dev.* TO 'lms_user'@'%';
GRANT ALL PRIVILEGES ON lms_ai_test.* TO 'lms_user'@'%';

FLUSH PRIVILEGES;