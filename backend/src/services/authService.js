const Otp = require('../models/Otp');
const Student = require('../models/Student');

async function verifyOtp(email, otp, session, roomCode) {
  const record = await Otp.findOne({ email });
  if (!record || record.otp !== otp || record.expiresAt < new Date()) {
    throw new Error('Invalid or expired OTP');
  }

  await Student.findOneAndUpdate({ email }, { email }, { upsert: true, new: true });

  await Otp.deleteOne({ email });

  if (roomCode) {
    session.role = 'participant';
    session.email = email;
    session.roomCode = roomCode;
    return { role: 'participant', email, roomCode };
  }

  session.role = 'user';
  session.email = email;
  return { role: 'user', email };
}

async function adminLogin(email, password, session) {
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    throw new Error('Invalid admin credentials');
  }

  session.role = 'admin';
  session.email = email;

  return { role: 'admin', email };
}

function logout(session) {
  return new Promise((resolve, reject) => {
    session.destroy(err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { verifyOtp, adminLogin, logout };
