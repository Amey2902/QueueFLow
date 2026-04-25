const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Otp = require('../models/Otp');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtp(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address');
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.findOneAndUpdate(
    { email },
    { email, otp, expiresAt },
    { upsert: true, new: true }
  );

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Your OTP for Digital Queue System',
    text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
  });

  return otp;
}

module.exports = { sendOtp };
