/**
 * Tests for validation result discriminated union type
 * Ensures TypeScript correctly narrows types based on success flag
 */

import { ValidationResult } from '../validation-types';

describe('ValidationResult discriminated union', () => {
  it('should guarantee data property exists when success is true', () => {
    const successResult: ValidationResult<string> = {
      success: true,
      data: 'valid-data',
    };

    expect(successResult.success).toBe(true);
    if (successResult.success) {
      // TypeScript should narrow the type and guarantee data exists
      expect(successResult.data).toBe('valid-data');
      // This line should not cause TypeScript errors
      const data: string = successResult.data;
      expect(data).toBe('valid-data');
    }
  });

  it('should guarantee error property exists when success is false', () => {
    const failureResult: ValidationResult<string> = {
      success: false,
      error: 'Validation failed',
    };

    expect(failureResult.success).toBe(false);
    if (!failureResult.success) {
      // TypeScript should narrow the type and guarantee error exists
      expect(failureResult.error).toBe('Validation failed');
      // This line should not cause TypeScript errors
      const error: string = failureResult.error;
      expect(error).toBe('Validation failed');
    }
  });

  it('should enable TypeScript type narrowing based on success flag', () => {
    const result: ValidationResult<number> = Math.random() > 0.5
      ? { success: true, data: 42 }
      : { success: false, error: 'Invalid number' };

    if (result.success) {
      // In this branch, TypeScript knows result.data exists
      const value: number = result.data;
      expect(typeof value).toBe('number');
    } else {
      // In this branch, TypeScript knows result.error exists
      const errorMsg: string = result.error;
      expect(typeof errorMsg).toBe('string');
    }
  });

  it('should allow safe access to data without null checks when success is verified', () => {
    const validateInput = (value: string): ValidationResult<number> => {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        return { success: false, error: 'Not a number' };
      }
      return { success: true, data: num };
    };

    const result = validateInput('123');

    expect(result.success).toBe(true);
    if (result.success) {
      // No need for null checks - TypeScript guarantees data exists
      expect(result.data).toBe(123);
      const doubled = result.data * 2;
      expect(doubled).toBe(246);
    }
  });
});
