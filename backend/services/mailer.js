const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST) {
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendOtpEmail(to, code) {
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('Email service is not configured');
      err.status = 500;
      throw err;
    }
    // local development: print the code instead of emailing it
    console.log(`\n[OTP] Code for ${to}: ${code}  (SMTP not configured)\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Your BookMyVenue verification code',
    text: `Your BookMyVenue verification code is ${code}. It expires in 5 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px">
      <h2 style="margin:0 0 8px">BookMyVenue</h2>
      <p>Use this code to finish creating your account:</p>
      <p style="font-size:30px;letter-spacing:6px;font-weight:bold">${code}</p>
      <p style="color:#666;font-size:13px">It expires in 5 minutes. If you didn't request it, ignore this email.</p>
    </div>`,
  });
}

module.exports = { sendOtpEmail };