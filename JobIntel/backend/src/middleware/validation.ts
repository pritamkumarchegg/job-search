/**
 * Request validation utilities
 */

export const validateRequest = {
  checkParamExists: (paramName: string, value: any): void => {
    if (!value) {
      throw new Error(`Missing required parameter: ${paramName}`);
    }
  },

  checkBodyField: (fieldName: string, value: any): void => {
    if (!value) {
      throw new Error(`Missing required field: ${fieldName}`);
    }
  },

  checkMinLength: (value: string, minLength: number, fieldName: string): void => {
    if (typeof value !== 'string' || value.length < minLength) {
      throw new Error(`${fieldName} must be at least ${minLength} characters long`);
    }
  },

  checkValidEmail: (email: string): void => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  },
};
