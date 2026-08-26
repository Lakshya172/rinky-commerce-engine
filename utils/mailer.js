const crypto = require('crypto');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'rinkyjewellers0@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Rinky Jewellers';
const BASE_URL = process.env.BASE_URL;

async function sendEmailViaBrevo(toEmail, toName, subject, htmlContent) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL
        },
        to: [
          {
            email: toEmail,
            name: toName
          }
        ],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo Error:', errorData);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

async function sendVerificationEmail(req, user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.verificationToken = token;
  await user.save();

  const domain = BASE_URL || `${req.protocol}://${req.get('host')}`;
  const verifyUrl = `${domain}/api/auth/verify-email/${token}`;

  console.log('----------------------------------------------------');
  console.log(`🔑 Verification Link for ${user.email}:`);
  console.log(verifyUrl);
  console.log('----------------------------------------------------');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #c4a15b; text-align: center;">Welcome to Rinky Jewellers!</h2>
      <p>Hello ${user.name},</p>
      <p>Thank you for registering. Please verify your email address to activate your account by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #c4a15b; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #555;">${verifyUrl}</p>
      <p>Best regards,<br>The Rinky Jewellers Team</p>
    </div>
  `;

  return sendEmailViaBrevo(user.email, user.name, 'Verify your email - Rinky Jewellers', htmlContent);
}

async function sendPasswordResetEmail(req, user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const domain = BASE_URL || `${req.protocol}://${req.get('host')}`;
  const resetUrl = `${domain}/reset-password?token=${token}`;

  console.log('----------------------------------------------------');
  console.log(`🔑 Password Reset Link for ${user.email}:`);
  console.log(resetUrl);
  console.log('----------------------------------------------------');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #c4a15b; text-align: center;">Password Reset Request</h2>
      <p>Hello ${user.name},</p>
      <p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
      <p>Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #c4a15b; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If the button doesn't work, use this link:</p>
      <p style="word-break: break-all; font-size: 14px; color: #555;">${resetUrl}</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    </div>
  `;

  return sendEmailViaBrevo(user.email, user.name, 'Password Reset - Rinky Jewellers', htmlContent);
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
