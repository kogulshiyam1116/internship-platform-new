import { Resend } from 'resend'
import { 
  getApprovedEmailTemplate, 
  getRejectedEmailTemplate,
  getAdminNotificationTemplate,
  getWelcomeEmailTemplate,
  getPasswordResetEmailTemplate 
} from './emailTemplates'

// Check if API key exists
const apiKey = process.env.RESEND_API_KEY;

// Only initialize Resend if API key exists
let resend = null;
if (apiKey) {
  resend = new Resend(apiKey);
  console.log('✅ Resend initialized successfully');
  console.log('📧 Using API key starting with:', apiKey.substring(0, 10) + '...');
} else {
  console.warn('⚠️ RESEND_API_KEY not found. Emails will be logged but not sent.');
}

// Email addresses configuration
// TODO: Change to your verified domain after DNS verification
const FROM_EMAIL = 'onboarding@resend.dev' // Temporary - will work but may go to spam
const ADMIN_EMAIL = 'admin@arescomp.com'

// Test helper function - call this to verify Resend is working
export async function testResendConnection() {
  console.log('🧪 Testing Resend connection...');
  
  if (!resend) {
    console.log('❌ Resend not initialized - check API key');
    return { success: false, error: 'Resend not initialized' };
  }

  try {
    // Using Resend's special test email that always works
    const testEmail = 'delivered@resend.dev';
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: testEmail,
      subject: 'Test Email from Internship Platform',
      html: '<h1>Test</h1><p>If you see this, Resend is working!</p>',
    });

    if (error) {
      console.error('❌ Test failed:', error);
      return { success: false, error };
    }

    console.log('✅ Test successful! Email ID:', data?.id);
    console.log('📝 Check your Resend dashboard to verify delivery');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Test exception:', error);
    return { success: false, error };
  }
}

export const emailService = {
  // Send approval notification to student
  async sendApprovalNotification(studentEmail, studentName, taskTitle, feedback) {
    console.log('📧 Sending approval email to:', studentEmail);
    console.log('📧 Using from address:', FROM_EMAIL);
    
    if (!resend) {
      console.log('⚠️ Email not sent - no API key');
      return { success: false, reason: 'No API key' };
    }

    try {
      const template = getApprovedEmailTemplate(studentName, taskTitle, feedback)
      
      console.log('📧 Email subject:', template.subject);
      
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: studentEmail,
        subject: template.subject,
        html: template.html,
      })

      if (error) {
        console.error('❌ Error sending approval email:', error)
        return { success: false, error };
      }

      console.log('✅ Approval email sent successfully!')
      console.log('📧 Email ID:', data?.id)
      console.log('📝 Note: Check spam folder if not in inbox')
      return { success: true, data };
    } catch (error) {
      console.error('❌ Failed to send approval email:', error)
      return { success: false, error };
    }
  },

  // Send rejection notification to student
  async sendRejectionNotification(studentEmail, studentName, taskTitle, feedback) {
    console.log('📧 Sending rejection email to:', studentEmail);
    console.log('📧 Using from address:', FROM_EMAIL);
    
    if (!resend) {
      console.log('⚠️ Email not sent - no API key');
      return { success: false, reason: 'No API key' };
    }

    try {
      const template = getRejectedEmailTemplate(studentName, taskTitle, feedback)
      
      console.log('📧 Email subject:', template.subject);
      
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: studentEmail,
        subject: template.subject,
        html: template.html,
      })

      if (error) {
        console.error('❌ Error sending rejection email:', error)
        return { success: false, error };
      }

      console.log('✅ Rejection email sent successfully!')
      console.log('📧 Email ID:', data?.id)
      return { success: true, data };
    } catch (error) {
      console.error('❌ Failed to send rejection email:', error)
      return { success: false, error };
    }
  },

  // Notify admin of new submission
  async notifyAdminNewSubmission(studentName, taskTitle, submissionId) {
    console.log('📧 Sending admin notification');
    console.log('📧 To admin:', ADMIN_EMAIL);
    
    if (!resend) {
      console.log('⚠️ Email not sent - no API key');
      return { success: false, reason: 'No API key' };
    }

    try {
      const template = getAdminNotificationTemplate(studentName, taskTitle, submissionId)
      
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: template.subject,
        html: template.html,
      })

      if (error) {
        console.error('❌ Error sending admin notification:', error)
        return { success: false, error };
      }

      console.log('✅ Admin notification sent successfully!')
      console.log('📧 Email ID:', data?.id)
      return { success: true, data };
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error)
      return { success: false, error };
    }
  },

  // Send welcome email to new student
  async sendWelcomeEmail(studentEmail, studentName, password) {
    console.log('📧 Sending welcome email to:', studentEmail);
    console.log('📧 Using from address:', FROM_EMAIL);
    
    if (!resend) {
      console.log('⚠️ Email not sent - no API key');
      return { success: false, reason: 'No API key' };
    }

    try {
      const template = getWelcomeEmailTemplate(studentName, studentEmail, password)
      
      console.log('📧 Email subject:', template.subject);
      console.log('📧 Email template prepared successfully');
      
      // Log first 100 chars of HTML for debugging
      console.log('📧 HTML preview:', template.html.substring(0, 100) + '...');
      
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: studentEmail,
        subject: template.subject,
        html: template.html,
        // Add reply-to for better deliverability
        reply_to: ADMIN_EMAIL,
        // Add headers to help with spam filters
        headers: {
          'X-Entity-Ref-ID': Date.now().toString(),
        }
      })

      if (error) {
        console.error('❌ Error sending welcome email:', error)
        // Log the full error object for debugging
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
        return { success: false, error };
      }

      console.log('✅ Welcome email sent successfully!')
      console.log('📧 Email ID:', data?.id)
      console.log('📝 IMPORTANT: Check spam folder if not in inbox')
      console.log('📝 Resend Dashboard: https://resend.com/emails')
      return { success: true, data };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error)
      return { success: false, error };
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(studentEmail, studentName, newPassword) {
    console.log('📧 Sending password reset email to:', studentEmail);
    
    if (!resend) {
      console.log('⚠️ Email not sent - no API key');
      return { success: false, reason: 'No API key' };
    }

    try {
      const template = getPasswordResetEmailTemplate(studentName, studentEmail, newPassword)
      
      console.log('📧 Email subject:', template.subject);
      
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: studentEmail,
        subject: template.subject,
        html: template.html,
        reply_to: ADMIN_EMAIL,
      })

      if (error) {
        console.error('❌ Error sending password reset email:', error)
        return { success: false, error };
      }

      console.log('✅ Password reset email sent successfully!')
      console.log('📧 Email ID:', data?.id)
      return { success: true, data };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error)
      return { success: false, error };
    }
  }
}

// For debugging - log initialization status
console.log('📧 Email Service Status:', {
  initialized: !!resend,
  fromEmail: FROM_EMAIL,
  adminEmail: ADMIN_EMAIL,
  apiKeyExists: !!apiKey
});