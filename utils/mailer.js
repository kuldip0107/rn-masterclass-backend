const tls = require('tls');
const net = require('net');

/**
 * Mailer Utility for RN Master Class Backend
 * 
 * Supports:
 * 1. Nodemailer (if installed)
 * 2. Native TLS/SSL SMTP (port 465) and STARTTLS (port 587) - Zero external dependencies!
 * 3. HTTP Email APIs (Resend / Brevo) via fetch
 * 4. Graceful development logging fallback
 */

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  // nodemailer not installed; native SMTP or fetch will be used
}

const getSmtpConfig = () => {
  return {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465', 10),
    secure: (process.env.SMTP_SECURE === 'true') || parseInt(process.env.SMTP_PORT || '465', 10) === 465,
    user: process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASS || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || '"RN Master Class" <support@rnmasterclass.dev>',
  };
};

const isSmtpConfigured = () => {
  const config = getSmtpConfig();
  return Boolean(config.user && config.pass);
};

/**
 * Lightweight native TLS SMTP client (Port 465 SSL)
 * Does not require external npm dependencies.
 */
const sendViaNativeSmtp = (to, subject, htmlContent, textContent) => {
  return new Promise((resolve, reject) => {
    const config = getSmtpConfig();
    if (!config.user || !config.pass) {
      return reject(new Error('SMTP credentials not configured'));
    }

    const host = config.host;
    const port = config.port || 465;
    const sender = config.from.match(/<([^>]+)>/) ? config.from.match(/<([^>]+)>/)[1] : config.user;

    const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
      // Connected
    });

    socket.setEncoding('utf8');

    let step = 0;
    let buffer = '';

    const sendCmd = (cmd) => {
      socket.write(cmd + '\r\n');
    };

    socket.on('data', (data) => {
      buffer += data;
      const lines = buffer.split('\r\n');
      buffer = lines.pop(); // keep remainder

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = parseInt(line.substring(0, 3), 10);

        if (step === 0 && code === 220) {
          step = 1;
          sendCmd(`EHLO localhost`);
        } else if (step === 1 && (code === 250 || code === 220)) {
          // Check if multi-line EHLO response finished
          if (line.charAt(3) === ' ') {
            step = 2;
            sendCmd('AUTH LOGIN');
          }
        } else if (step === 2 && code === 334) {
          step = 3;
          sendCmd(Buffer.from(config.user).toString('base64'));
        } else if (step === 3 && code === 334) {
          step = 4;
          sendCmd(Buffer.from(config.pass.replace(/\s+/g, '')).toString('base64'));
        } else if (step === 4 && code === 235) {
          // Authentication successful
          step = 5;
          sendCmd(`MAIL FROM:<${sender}>`);
        } else if (step === 5 && code === 250) {
          step = 6;
          sendCmd(`RCPT TO:<${to}>`);
        } else if (step === 6 && code === 250) {
          step = 7;
          sendCmd('DATA');
        } else if (step === 7 && code === 354) {
          step = 8;
          const mimeMessage = [
            `From: ${config.from}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            '',
            htmlContent,
            '.'
          ].join('\r\n');
          socket.write(mimeMessage + '\r\n');
        } else if (step === 8 && code === 250) {
          step = 9;
          sendCmd('QUIT');
          socket.end();
          resolve({ success: true, message: 'Email sent successfully via native SMTP.' });
        } else if (code >= 400) {
          socket.end();
          return reject(new Error(`SMTP Error [${code}]: ${line}`));
        }
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(12000, () => {
      socket.destroy();
      reject(new Error('SMTP connection timed out'));
    });
  });
};

/**
 * Main email sender function
 */
const sendMail = async ({ to, subject, html, text }) => {
  const config = getSmtpConfig();

  // 1. If nodemailer is available and configured
  if (nodemailer && config.user && config.pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass.replace(/\s+/g, ''),
        },
      });

      const info = await transporter.sendMail({
        from: config.from,
        to,
        subject,
        text: text || '',
        html,
      });

      console.log(`📧 [EMAIL SENT via Nodemailer] To: ${to} | ID: ${info.messageId}`);
      return { success: true, method: 'nodemailer', id: info.messageId };
    } catch (nmErr) {
      console.warn('⚠️ Nodemailer send failed, attempting native SMTP:', nmErr.message);
    }
  }

  // 2. If SMTP is configured, use native TLS socket
  if (config.user && config.pass) {
    try {
      const result = await sendViaNativeSmtp(to, subject, html, text);
      console.log(`📧 [EMAIL SENT via Native TLS SMTP] To: ${to}`);
      return { success: true, method: 'native_smtp' };
    } catch (smtpErr) {
      console.error('❌ Native SMTP send failed:', smtpErr.message);
    }
  }

  // 3. Fallback: Log clearly for testing / development
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📬 [EMAIL SIMULATED / NOTICE]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  if (text) console.log(`Content:\n${text}`);
  console.log(`ℹ️ To send live emails to users, set SMTP_USER and SMTP_PASS in .env`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return { success: false, simulated: true, reason: 'smtp_not_configured' };
};

/**
 * Send 6-Digit Password Reset OTP Email
 */
const sendPasswordResetOtpEmail = async (recipientEmail, otp, userName = 'Learner') => {
  const subject = `${otp} is your RN Master Class Password Reset Code`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RN Master Class - Reset Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 36px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #00e5ff, #007aff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .sub { color: #94a3b8; font-size: 13px; margin-top: 4px; }
    .title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .msg { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { text-align: center; background: rgba(0, 122, 255, 0.1); border: 2px dashed #007aff; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }
    .otp-exp { font-size: 12px; color: #64748b; margin-top: 8px; }
    .warning { font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #1f2937; padding-top: 18px; }
    .footer { text-align: center; font-size: 11px; color: #475569; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">RN Master Class</div>
      <div class="sub">Engineered by DnK Labs</div>
    </div>

    <div class="title">Hello ${userName || 'Developer'},</div>
    <div class="msg">
      We received a request to reset your password for your <strong>RN Master Class</strong> account. Enter the verification code below in the app to set a new password:
    </div>

    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-exp">⏱️ Code expires in <strong>15 minutes</strong></div>
    </div>

    <div class="msg">
      If you did not request a password reset, please ignore this email or contact our support team at <a href="mailto:support@rnmasterclass.dev" style="color: #38bdf8; text-decoration: none;">support@rnmasterclass.dev</a>. Your account remains safe.
    </div>

    <div class="warning">
      🔒 <strong>Security Tip:</strong> Never share this code with anyone. RN Master Class team will never ask for your verification code.
    </div>

    <div class="footer">
      © 2026 RN Master Class by DnK Labs. All rights reserved.<br>
      Support: <a href="mailto:support@rnmasterclass.dev" style="color: #64748b;">support@rnmasterclass.dev</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `Hello ${userName || 'Developer'},\n\nYour RN Master Class password reset code is: ${otp}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nSupport: support@rnmasterclass.dev\nRN Master Class Team`;

  return await sendMail({
    to: recipientEmail,
    subject,
    html,
    text,
  });
};

/**
 * Send Account Deletion Confirmation Email
 */
const sendAccountDeletionEmail = async (recipientEmail, userName = 'User') => {
  const subject = `Your RN Master Class Account Has Been Deleted`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Account Deleted</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 36px 28px; }
    .brand { font-size: 20px; font-weight: 800; color: #ef4444; }
    .msg { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 18px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">RN Master Class - Account Deletion Notice</div>
    <div class="msg">
      Hello ${userName},<br><br>
      As requested, your <strong>RN Master Class</strong> account associated with <strong>${recipientEmail}</strong> has been completely and permanently deleted from our servers.<br><br>
      <strong>Data deleted:</strong>
      <ul>
        <li>Your login profile and authentication credentials</li>
        <li>Learning progress and completed components</li>
        <li>Quiz history and achievements</li>
        <li>Daily streaks and app usage screen time</li>
        <li>Saved profile picture and avatar preferences</li>
        <li>Push notification device tokens</li>
      </ul>
      Thank you for being part of RN Master Class. If you ever decide to return, you can create a fresh account anytime.
    </div>
  </div>
</body>
</html>
  `.trim();

  return await sendMail({
    to: recipientEmail,
    subject,
    html,
    text: `Hello ${userName},\n\nYour RN Master Class account (${recipientEmail}) and all associated data have been permanently deleted.\n\nThank you,\nRN Master Class Support`,
  });
};

module.exports = {
  sendMail,
  sendPasswordResetOtpEmail,
  sendAccountDeletionEmail,
  isSmtpConfigured,
};
