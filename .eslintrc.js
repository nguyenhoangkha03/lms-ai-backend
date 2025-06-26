module.exports = {
  parser: '@typescript-eslint/parser', // để eslint có thể đọc và hiểu ts
  // cung cấp các tùy chọn bổ sung
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  root: true, // ngăn eslint tìm tệp cấu hình khác
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'], // không kiểm tra tệp này
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off', // tắt I ví dụ IUser
    '@typescript-eslint/explicit-function-return-type': 'off', // tắt kiểu trả về
    '@typescript-eslint/explicit-module-boundary-types': 'off', // tắt export rõ ràng
    '@typescript-eslint/no-explicit-any': 'off', // tắt quy tắt cấm sử dụng any

    // Báo lỗi nếu có biến không được sử dụng,
    // NHƯNG bỏ qua cho các tham số hàm bắt đầu bằng dấu '_'
    // Rất hữu ích khi bạn cần khai báo tham số nhưng không dùng đến nó.
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-empty-function': 'off', // Cho phép các hàm rỗng (không có nội dung)
    'prettier/prettier': [
      // nếu không chuẩn prettier báo lỗi
      'error',
      {
        endOfLine: 'auto',
      },
    ],
  },
};
