// Email service using SendGrid
import axios, { AxiosResponse } from 'axios';

interface EmailData {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_EMAILS_PER_WINDOW = 5; // Maximum emails per hour per email address

// In-memory rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

const isRateLimited = (email: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(email);

  if (!userLimit) {
    rateLimitStore.set(email, { count: 1, timestamp: now });
    return false;
  }

  // Reset if window has passed
  if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(email, { count: 1, timestamp: now });
    return false;
  }

  // Check if limit exceeded
  if (userLimit.count >= MAX_EMAILS_PER_WINDOW) {
    return true;
  }

  // Increment count
  userLimit.count++;
  return false;
};

/**
 * Sends a verification code email to the user
 * 
 * @param {string} email - User's email address
 * @param {string} verificationCode - 6-digit verification code
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
export const sendVerificationEmail = async (email: string, verificationCode: string): Promise<boolean> => {
  try {
    // Check rate limiting
    if (isRateLimited(email)) {
      throw new Error(`Too many verification attempts. Please try again in ${Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - (rateLimitStore.get(email)?.timestamp || 0))) / 60000)} minutes.`);
    }

    // Create the email content
    const emailData: EmailData = {
      to: email,
      from: process.env.NEXT_PUBLIC_EMAIL_FROM || 'noreply@social-plan.app',
      subject: 'Your Social-Plan Verification Code',
      text: `Your verification code is: ${verificationCode}. This code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4F46E5;">Social-Plan Verification</h2>
          <p>Thank you for signing up for Social-Plan! To complete your registration, please use the following code:</p>
          <div style="margin: 30px 0; padding: 10px; background-color: #F3F4F6; border-radius: 4px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">${verificationCode}</div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
          <p style="margin-top: 40px; font-size: 12px; color: #6B7280;">© ${new Date().getFullYear()} Social-Plan. All rights reserved.</p>
        </div>
      `
    };

    // In development, just log the code and return success
    if (process.env.NODE_ENV === 'development') {
      console.log('DEVELOPMENT MODE: Email would be sent with code:', verificationCode);
      console.log('Email data:', emailData);
      return true;
    }

    // Send email via SendGrid API
    const response = await axios.post('/api/send-email', emailData);
    
    if (response.status !== 200) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    
    // Handle specific error cases
    if (error.response?.status === 429) {
      throw new Error('Too many email requests. Please try again later.');
    } else if (error.response?.status === 403) {
      throw new Error('Email sending is currently disabled. Please try again later.');
    } else if (error.response?.status === 400) {
      throw new Error('Invalid email address.');
    }
    
    throw new Error('Failed to send verification email. Please try again later.');
  }
}; 