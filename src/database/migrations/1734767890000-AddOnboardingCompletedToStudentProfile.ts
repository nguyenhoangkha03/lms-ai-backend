import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOnboardingCompletedToStudentProfile1734767890000 implements MigrationInterface {
  name = 'AddOnboardingCompletedToStudentProfile1734767890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add onboardingCompleted column to student_profiles table
    await queryRunner.addColumn(
      'student_profiles',
      new TableColumn({
        name: 'onboardingCompleted',
        type: 'boolean',
        default: false,
        comment: 'Sinh viên đã hoàn thành quy trình onboarding',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove onboardingCompleted column from student_profiles table
    await queryRunner.dropColumn('student_profiles', 'onboardingCompleted');
  }
}