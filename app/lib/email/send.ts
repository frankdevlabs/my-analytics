/**
 * Email Service - Resend API Integration
 * Handles email sending with retry logic, delivery logging, and rate limiting
 */

import { Resend } from 'resend';
import { EmailType, EmailStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

/**
 * Custom error class for email send failures
 */
export class EmailSendError extends Error {
  public code?: string;
  public cause?: Error;

  constructor(message: string, code?: string, cause?: Error) {
    super(message);
    this.name = 'EmailSendError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Lazily initialized Resend client.
 * Deferred so the module can load even when RESEND_API_KEY is not yet set;
 * the key is checked at send-time in sendEmail().
 */
let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Email send parameters
 */
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  userId: string;
  websiteId?: string | null;
  emailType: EmailType;
}

/**
 * Email send result
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Check if error is a rate limit error from Resend
 */
function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode === 429;
  }
  return false;
}

/**
 * Retry helper with exponential backoff for email sending
 * Retries 3 times with delays: 100ms, 200ms, 400ms
 * Does not retry rate limit errors
 */
async function retryEmailSend<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: Error = new Error('Email send failed');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry rate limit errors - fail immediately
      if (isRateLimitError(error)) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        break;
      }

      // Calculate exponential backoff delay
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      console.error(
        `Email send failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new EmailSendError(
    'Email send failed after retries',
    undefined,
    lastError
  );
}

/**
 * Log email delivery attempt to database
 */
async function logEmailDelivery(
  params: SendEmailParams,
  status: EmailStatus,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.emailDeliveryLog.create({
      data: {
        userId: params.userId,
        websiteId: params.websiteId || null,
        emailType: params.emailType,
        recipientEmail: params.to,
        status,
        errorMessage: errorMessage || null,
      },
    });
  } catch (error) {
    // Log database error but don't throw - we don't want logging failures to break email sending
    console.error('Failed to log email delivery:', error);
  }
}

/**
 * Send email using Resend API with retry logic and delivery logging
 *
 * @param params - Email parameters including recipient, subject, content, and metadata
 * @returns Promise<SendEmailResult> with success status and messageId or error
 *
 * @example
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Daily Report',
 *   html: '<h1>Your Report</h1>',
 *   text: 'Your Report',
 *   userId: 'user123',
 *   websiteId: 'website456',
 *   emailType: 'DAILY_REPORT'
 * });
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text, userId, websiteId, emailType } = params;

  try {
    // Validate API key is configured
    if (!process.env.RESEND_API_KEY) {
      const error = 'RESEND_API_KEY environment variable is not configured';
      console.error(error);
      await logEmailDelivery(params, EmailStatus.FAILED, error);
      return { success: false, error };
    }

    // Send email with retry logic
    const result = await retryEmailSend(async () => {
      return await getResendClient().emails.send({
        from: 'My Analytics <noreply@myanalytics.com>',
        to,
        subject,
        html,
        text: text || undefined,
      });
    });

    // Log successful delivery
    await logEmailDelivery(params, EmailStatus.SENT);

    console.log(`Email sent successfully: ${emailType} to ${to}`, {
      messageId: result.data?.id,
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error: unknown) {
    // Handle rate limiting errors
    if (isRateLimitError(error)) {
      const errorMsg = 'Rate limit exceeded. Free tier: 100 emails/day, 3000/month';
      console.warn(errorMsg, {
        emailType,
        to,
      });
      await logEmailDelivery(params, EmailStatus.FAILED, errorMsg);
      return { success: false, error: errorMsg };
    }

    // Handle other errors
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Failed to send email:', {
      error: errorMsg,
      emailType,
      to,
      userId,
      websiteId,
    });

    await logEmailDelivery(params, EmailStatus.FAILED, errorMsg);

    return {
      success: false,
      error: errorMsg,
    };
  }
}
