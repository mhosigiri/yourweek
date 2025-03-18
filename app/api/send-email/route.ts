import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_EMAILS_PER_WINDOW = 5; // Maximum emails per hour per IP

// In-memory rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const ipLimit = rateLimitStore.get(ip);

  if (!ipLimit) {
    rateLimitStore.set(ip, { count: 1, timestamp: now });
    return false;
  }

  // Reset if window has passed
  if (now - ipLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(ip, { count: 1, timestamp: now });
    return false;
  }

  // Check if limit exceeded
  if (ipLimit.count >= MAX_EMAILS_PER_WINDOW) {
    return true;
  }

  // Increment count
  ipLimit.count++;
  return false;
};

interface EmailRequestBody {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    // Check rate limiting
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body: EmailRequestBody = await request.json();
    const { to, from, subject, text, html } = body;

    // Validate required fields
    if (!to || !from || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    // Create message with required content field
    const msg: any = {
      to,
      from,
      subject
    };
    
    // Add either text or html content
    if (text) {
      msg.text = text;
    }
    
    if (html) {
      msg.html = html;
    }
    
    // Send email
    await sgMail.send(msg);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending email:', error);

    // Handle SendGrid specific errors
    if (error.response) {
      const { status, body } = error.response;
      
      switch (status) {
        case 401:
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401 }
          );
        case 403:
          return NextResponse.json(
            { error: 'Email sending is disabled' },
            { status: 403 }
          );
        case 429:
          return NextResponse.json(
            { error: 'Too many requests to SendGrid' },
            { status: 429 }
          );
        default:
          return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 