// Email template for submission approved
export const getApprovedEmailTemplate = (studentName, taskTitle, feedback) => ({
  subject: `✅ Your submission for "${taskTitle}" has been approved!`,
  html: `...` // Your HTML template here
})

// Email template for submission rejected
export const getRejectedEmailTemplate = (studentName, taskTitle, feedback) => ({
  subject: `📝 Your submission for "${taskTitle}" needs revisions`,
  html: `...` // Your HTML template here
})

// Email template for admin notification (new submission)
export const getAdminNotificationTemplate = (studentName, taskTitle, submissionId) => ({
  subject: `📬 New submission from ${studentName}`,
  html: `...` // Your HTML template here
})


// Add this to your existing emailTemplates.js

// Welcome email for new students
export const getWelcomeEmailTemplate = (studentName, email, password) => ({
  subject: `🎉 Welcome to Internship Platform!`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome Aboard!</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${studentName}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Your account has been created for the Internship Management Platform. You can now log in to view and submit your tasks.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Login URL:</strong> ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
        </div>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            ⚠️ For security reasons, please change your password after logging in.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" 
             style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Login to Your Account
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
          This is an automated message from your Internship Management Platform.<br>
          Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `
})

// Password reset email
export const getPasswordResetEmailTemplate = (studentName, email, newPassword) => ({
  subject: `🔐 Your password has been reset`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${studentName}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Your password has been reset by an administrator.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>New Password:</strong> ${newPassword}</p>
        </div>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            ⚠️ Please change this password after logging in for security.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" 
             style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Login with New Password
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
          This is an automated message from your Internship Management Platform.<br>
          Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `
})