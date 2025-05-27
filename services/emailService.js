const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');
require('dotenv').config();

// Validate environment variables
const { EMAIL_USER, EMAIL_PW } = process.env;
if (!EMAIL_USER || !EMAIL_PW) {
  logger.error('Missing required environment variables: EMAIL_USER or EMAIL_PW');
  process.exit(1);
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PW },
});

// Base email sending function
const sendEmail = async (to, subject, html, text) => {
  const mailOptions = {
    from: `"Digital Farmers" <${EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// OTP email template
const getOTPEmailTemplate = (email, username, otp, type) => {
  console.log(username, email, otp, type);
  const isPasswordReset = type === 'password_reset';
  const actionText = isPasswordReset ? 'Reset Your Password' : 'Verify Your Email';
  const greetingText = isPasswordReset
    ? 'Password reset request for Digital Farmers.'
    : `Welcome, ${username || 'User'}!`;
  const instructionText = isPasswordReset
    ? 'Use the OTP below to reset your password (expires in 10 minutes).'
    : 'Verify your email with the OTP below (expires in 10 minutes).';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${isPasswordReset ? 'Password Reset OTP' : 'Verify Your Email'}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { padding: 20px; text-align: center; background: #28a745; border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .content { padding: 30px; text-align: center; }
        .footer { padding: 20px; text-align: center; background: #f8f9fa; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
        h1 { font-size: 24px; color: #333; margin: 0 0 20px; }
        p { font-size: 16px; color: #666; line-height: 1.5; margin: 0 0 20px; }
        .otp { font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 5px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #28a745; color: #fff; text-decoration: none; font-size: 16px; border-radius: 5px; }
        .footer p { font-size: 12px; color: #999; margin: 0 0 10px; }
        .footer a { color: #28a745; text-decoration: none; }
        /* Styles for the header icon and title */
        .header-icon {
            margin-right: 12px;
            vertical-align: middle;
            font-size: 32px;
            color: #fff;
        }
        .header-title {
            display: inline-flex;
            align-items: center;
            font-size: 24px;
            color: #fff;
            font-weight: bold;
        }
        @media (max-width: 600px) {
          .container { width: 100%; }
          .content { padding: 15px; }
          h1 { font-size: 20px; }
          p { font-size: 14px; }
          .button { padding: 10px 20px; font-size: 14px; }
          .header-icon { font-size: 24px; margin-right: 10px; }
          .header-title { font-size: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-title">
            <i class="fas fa-leaf header-icon"></i> <span>Digital Farmers</span>
          </div>
        </div>
        <div class="content">
          <h1>${isPasswordReset ? 'Password Reset' : 'Email Verification'}</h1>
          <p>${greetingText}</p>
          <p>${instructionText}</p>
          <p class="otp">${otp}</p>
          <a href="${isPasswordReset ? `https://digitalfarmers.com/reset-password?email=${encodeURIComponent(email)}` : '#'}" class="button">${actionText}</a>
        </div>
        <div class="footer">
          <p>© 2025 Digital Farmers. All rights reserved.</p>
          <p>
            <a href="https://digitalfarmers.com/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a> |
            <a href="https://digitalfarmers.com/contact">Contact Us</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Welcome email template
const getWelcomeEmailTemplate = (email, username) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Welcome to Digital Farmers!</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { padding: 30px; text-align: center; background: linear-gradient(135deg, #28a745, #34c759); border-top-left-radius: 12px; border-top-right-radius: 12px; }
        .content { padding: 40px; text-align: center; }
        .footer { padding: 20px; text-align: center; background: #f8f9fa; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
        h1 { font-size: 28px; color: #fff; margin: 0 0 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        h2 { font-size: 22px; color: #333; margin: 0 0 20px; }
        p { font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px; }
        .button { display: inline-block; padding: 14px 30px; background: #28a745; color: #fff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: background 0.3s; }
        .button:hover { background: #34c759; }
        .footer p { font-size: 12px; color: #999; margin: 0 0 10px; }
        .footer a { color: #28a745; text-decoration: none; }
        /* Styles for the header icon and title */
        .header-icon {
            margin-right: 12px;
            vertical-align: middle;
            font-size: 32px;
            color: #fff;
        }
        .header-title {
            display: inline-flex;
            align-items: center;
            font-size: 28px;
            color: #fff;
            font-weight: bold;
        }
        @media (max-width: 600px) {
          .container { width: 100%; }
          .header, .content { padding: 20px; }
          h1 { font-size: 24px; }
          h2 { font-size: 18px; }
          p { font-size: 14px; }
          .button { padding: 12px 20px; font-size: 14px; }
          .header-icon { font-size: 24px; margin-right: 10px; }
          .header-title { font-size: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-title">
            <i class="fas fa-leaf header-icon"></i> <span>Digital Farmers</span>
          </div>
        </div>
        <div class="content">
          <h2>Congratulations on Joining Digital Farmers!</h2>
          <p>You're now part of a vibrant community dedicated to sustainable farming and innovation. We're thrilled to have you on board!</p>
          <p>Explore our platform to connect with fellow farmers, access market insights, and grow your agricultural journey.</p>
          <a href="https://digitalfarmers.com/dashboard" class="button">Get Started Now</a>
          <p>Need help? Visit our <a href="https://digitalfarmers.com/support" style="color: #28a745;">Support Center</a> or reply to this email.</p>
        </div>
        <div class="footer">
          <p>© 2025 Digital Farmers. All rights reserved.</p>
          <p>
            <a href="https://digitalfarmers.com/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a> |
            <a href="https://digitalfarmers.com/contact">Contact Us</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send OTP email
const sendOTPEmail = async (email, username, otp, type) => {
  const subject = type === 'password_reset' ? 'Password Reset OTP' : 'Verify Your Email';
  const html = getOTPEmailTemplate(email, username, otp, type);
  const text = `Your OTP for ${type === 'password_reset' ? 'password reset' : 'email verification'}: ${otp}`;
  return await sendEmail(email, subject, html, text);
};

// Send welcome email
const sendWelcomeEmail = async (email, username) => {
  const subject = 'Welcome to Digital Farmers!';
  const html = getWelcomeEmailTemplate(email, username);
  const text = `Welcome, ${username || 'User'}! You're now part of Digital Farmers. Visit https://digitalfarmers.com/dashboard to get started.`;
  return await sendEmail(email, subject, html, text);
};

module.exports = { sendOTPEmail, sendWelcomeEmail };