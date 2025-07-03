import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'strongPassword', async: false })
export class StrongPasswordValidator implements ValidatorConstraintInterface {
  validate(password: string, _args: ValidationArguments) {
    if (!password) return false;

    // At least 8 characters
    if (password.length < 8) return false;

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) return false;

    // At least one number
    if (!/\d/.test(password)) return false;

    // At least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

    // No common patterns
    const commonPatterns = [/123456/, /password/i, /qwerty/i, /abc123/i, /admin/i];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) return false;
    }

    return true;
  }

  defaultMessage(_args: ValidationArguments) {
    return `Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character. Avoid common patterns.`;
  }
}

@ValidatorConstraint({ name: 'passwordsMatch', async: false })
export class PasswordsMatchValidator implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return confirmPassword === relatedValue;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Passwords do not match';
  }
}
