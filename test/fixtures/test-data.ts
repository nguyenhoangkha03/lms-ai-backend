export class TestDataFactory {
  static createUserData(overrides: any = {}) {
    return {
      email: `test-${Date.now()}@example.com`,
      username: `testuser-${Date.now()}`,
      password: 'Password123!',
      userType: 'student',
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    };
  }

  static createCourseData(overrides: any = {}) {
    return {
      title: `Test Course ${Date.now()}`,
      slug: `test-course-${Date.now()}`,
      description: 'Test course description',
      level: 'beginner',
      language: 'en',
      price: 99.99,
      currency: 'USD',
      ...overrides,
    };
  }

  static createBulkUsers(count: number, type: string = 'student') {
    return Array.from({ length: count }, (_, i) =>
      this.createUserData({
        email: `${type}${i}@test.com`,
        username: `${type}${i}`,
        userType: type,
      }),
    );
  }

  static createBulkCourses(count: number, instructorId: string) {
    return Array.from({ length: count }, (_, i) =>
      this.createCourseData({
        title: `Course ${i}`,
        slug: `course-${i}`,
        instructorId,
      }),
    );
  }

  static createAssessmentData(courseId: string, overrides: any = {}) {
    return {
      title: `Test Assessment ${Date.now()}`,
      description: 'Test assessment description',
      courseId,
      type: 'quiz',
      timeLimit: 3600,
      maxAttempts: 3,
      passingScore: 70,
      ...overrides,
    };
  }

  static createQuestionData(assessmentId: string, overrides: any = {}) {
    return {
      assessmentId,
      questionText: 'What is the correct answer?',
      questionType: 'multiple_choice',
      points: 10,
      options: [
        { text: 'Option A', isCorrect: true },
        { text: 'Option B', isCorrect: false },
        { text: 'Option C', isCorrect: false },
        { text: 'Option D', isCorrect: false },
      ],
      ...overrides,
    };
  }
}
