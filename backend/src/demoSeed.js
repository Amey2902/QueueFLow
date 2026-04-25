require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Room = require('./models/Room');
const Token = require('./models/Token');
const Counter = require('./models/Counter');
const Organizer = require('./models/Organizer');
const Student = require('./models/Student');
const Slot = require('./models/Slot');
const Booking = require('./models/Booking');

const ROOM_CODE = 'DEMO-99';
const counters = ['Counter A', 'Counter B', 'Counter C'];

// sortOrder formula:
//   Pre-window walk-in:          tokenSeq * 1000
//   Slot window users:           slotMinuteOfDay * 10000 + seqWithinGroup
//   Walk-ins during slot window: slotMinuteOfDay * 10000 + 5000 + seqWithinGroup

function slotSortBase(slotStartTime) {
  const h = slotStartTime.getHours();
  const m = slotStartTime.getMinutes();
  return (h * 60 + m) * 10000;
}

async function createToken({ seq, email, roomCode, isSlotBooking, sortOrder, createdAt, status = 'waiting' }) {
  await Student.findOneAndUpdate({ email }, { email }, { upsert: true, new: true });
  const counterLabel = counters[(seq - 1) % 3];
  return Token.create({
    tokenNumber: seq,
    studentEmail: email,
    roomCode,
    counterLabel,
    isSlotBooking,
    sortOrder,
    status,
    startedServingAt: status === 'serving' ? new Date() : null,
    createdAt: createdAt || new Date()
  });
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Organizer ──────────────────────────────────────────────────
  await Organizer.findOneAndDelete({ email: 'demo@queueflow.com' });
  const organizer = await Organizer.create({
    name: 'Demo Organization',
    email: 'demo@queueflow.com',
    password: 'demo1234'
  });
  console.log('✅ Organizer: demo@queueflow.com / demo1234');

  // ── Room ───────────────────────────────────────────────────────
  await Room.findOneAndDelete({ roomCode: ROOM_CODE });
  const room = await Room.create({
    name: 'Passport Office',
    roomCode: ROOM_CODE,
    avgServiceTimeMin: 5,
    currentTokenSeq: 0,
    status: 'active',
    organizerId: organizer._id
  });
  console.log(`✅ Room: "${room.name}" — ${ROOM_CODE}`);

  // ── Counters ───────────────────────────────────────────────────
  await Counter.deleteMany({ roomCode: ROOM_CODE });
  for (const [label, email] of [
    ['Counter A', 'countera@demo.com'],
    ['Counter B', 'counterb@demo.com'],
    ['Counter C', 'counterc@demo.com']
  ]) {
    await Counter.create({ roomCode: ROOM_CODE, organizerId: organizer._id, label, email, password: 'counter123' });
  }
  console.log('✅ Counters: countera/b/c@demo.com / counter123');

  // ── Clear old data ─────────────────────────────────────────────
  await Token.deleteMany({ roomCode: ROOM_CODE });
  await Slot.deleteMany({ roomCode: ROOM_CODE });
  await Booking.deleteMany({ roomCode: ROOM_CODE });

  // ── Time setup: use today's date with fixed clock times ────────
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  function todayAt(h, m = 0) {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d;
  }

  // Two slot windows: 9:00–10:00 and 10:00–11:00
  const slot9Start  = todayAt(9, 0);
  const slot9End    = todayAt(10, 0);
  const slot10Start = todayAt(10, 0);
  const slot10End   = todayAt(11, 0);

  // Simulated join times
  const t_pre      = todayAt(8, 30);  // before any slot
  const t_during9  = todayAt(9, 15);  // inside 9:00 window
  const t_during10 = todayAt(10, 15); // inside 10:00 window

  // ── Slots ──────────────────────────────────────────────────────
  const slot9 = await Slot.create({
    roomCode: ROOM_CODE, startTime: slot9Start, endTime: slot9End,
    maxCapacity: 5, bookedCount: 0, date: dateStr
  });
  const slot10 = await Slot.create({
    roomCode: ROOM_CODE, startTime: slot10Start, endTime: slot10End,
    maxCapacity: 5, bookedCount: 0, date: dateStr
  });
  console.log(`✅ Slots: 9:00–10:00 and 10:00–11:00`);

  const base9  = slotSortBase(slot9Start);   // 540 * 10000 = 5400000
  const base10 = slotSortBase(slot10Start);  // 600 * 10000 = 6000000

  let seq = 0;

  // counters per group for sortOrder sequencing
  let slotSeq9 = 0, walkinSeq9 = 0, slotSeq10 = 0, walkinSeq10 = 0;

  // ── GROUP 1: Pre-9:00 walk-ins → sortOrder = tokenSeq * 1000 ──
  const preWalkins = [
    'pre.walkin1@demo.com', 'pre.walkin2@demo.com', 'pre.walkin3@demo.com',
    'pre.walkin4@demo.com', 'pre.walkin5@demo.com',
  ];
  for (const email of preWalkins) {
    seq++;
    await createToken({
      seq, email, roomCode: ROOM_CODE,
      isSlotBooking: false,
      sortOrder: seq * 1000,
      createdAt: t_pre,
      status: seq === 1 ? 'serving' : 'waiting'
    });
  }
  console.log(`✅ Pre-9:00 walk-ins: tokens #1–#${seq} | sortOrder: 1000, 2000, ..., ${seq * 1000}`);

  // ── GROUP 2: 9:00 slot users → sortOrder = base9 + slotSeq ────
  const slot9Users = ['slot9.user1@demo.com', 'slot9.user2@demo.com', 'slot9.user3@demo.com'];
  for (const email of slot9Users) {
    seq++; slotSeq9++;
    await Student.findOneAndUpdate({ email }, { email }, { upsert: true, new: true });
    await Booking.create({ slotId: slot9._id, roomCode: ROOM_CODE, email, date: dateStr });
    await Slot.findByIdAndUpdate(slot9._id, { $inc: { bookedCount: 1 } });
    await createToken({
      seq, email, roomCode: ROOM_CODE,
      isSlotBooking: true,
      sortOrder: base9 + slotSeq9,   // 5400001, 5400002, 5400003
      createdAt: t_during9
    });
  }
  console.log(`✅ 9:00 slot users:   tokens #${seq - slot9Users.length + 1}–#${seq} | sortOrder: ${base9 + 1}–${base9 + slotSeq9}`);

  // ── GROUP 3: 9:00–10:00 walk-ins → sortOrder = base9 + 5000 + walkinSeq ──
  const walkins9 = ['walkin9.1@demo.com', 'walkin9.2@demo.com', 'walkin9.3@demo.com'];
  for (const email of walkins9) {
    seq++; walkinSeq9++;
    await createToken({
      seq, email, roomCode: ROOM_CODE,
      isSlotBooking: false,
      sortOrder: base9 + 5000 + walkinSeq9,  // 5405001, 5405002, 5405003
      createdAt: t_during9
    });
  }
  console.log(`✅ 9:00–10:00 walk-ins: tokens #${seq - walkins9.length + 1}–#${seq} | sortOrder: ${base9 + 5001}–${base9 + 5000 + walkinSeq9}`);

  // ── GROUP 4: 10:00 slot users → sortOrder = base10 + slotSeq ──
  const slot10Users = ['slot10.user1@demo.com', 'slot10.user2@demo.com'];
  for (const email of slot10Users) {
    seq++; slotSeq10++;
    await Student.findOneAndUpdate({ email }, { email }, { upsert: true, new: true });
    await Booking.create({ slotId: slot10._id, roomCode: ROOM_CODE, email, date: dateStr });
    await Slot.findByIdAndUpdate(slot10._id, { $inc: { bookedCount: 1 } });
    await createToken({
      seq, email, roomCode: ROOM_CODE,
      isSlotBooking: true,
      sortOrder: base10 + slotSeq10,  // 6000001, 6000002
      createdAt: t_during10
    });
  }
  console.log(`✅ 10:00 slot users:  tokens #${seq - slot10Users.length + 1}–#${seq} | sortOrder: ${base10 + 1}–${base10 + slotSeq10}`);

  // ── GROUP 5: 10:00–11:00 walk-ins → sortOrder = base10 + 5000 + walkinSeq ──
  const walkins10 = ['walkin10.1@demo.com', 'walkin10.2@demo.com'];
  for (const email of walkins10) {
    seq++; walkinSeq10++;
    await createToken({
      seq, email, roomCode: ROOM_CODE,
      isSlotBooking: false,
      sortOrder: base10 + 5000 + walkinSeq10,  // 6005001, 6005002
      createdAt: t_during10
    });
  }
  console.log(`✅ 10:00–11:00 walk-ins: tokens #${seq - walkins10.length + 1}–#${seq} | sortOrder: ${base10 + 5001}–${base10 + 5000 + walkinSeq10}`);

  await Room.findOneAndUpdate({ roomCode: ROOM_CODE }, { currentTokenSeq: seq });

  // ── Demo student for live testing ──────────────────────────────
  await Student.findOneAndUpdate(
    { email: 'student@demo.com' },
    { email: 'student@demo.com' },
    { upsert: true, new: true }
  );

  // ── Print full queue order ─────────────────────────────────────
  const allTokens = await Token.find({ roomCode: ROOM_CODE, status: { $in: ['waiting', 'serving'] } })
    .sort({ sortOrder: 1, tokenNumber: 1 });

  console.log('\n========== FULL QUEUE ORDER ==========');
  allTokens.forEach((t, idx) => {
    const tag = t.isSlotBooking ? '🎟  SLOT   ' : '🚶 WALK-IN';
    const srv = t.status === 'serving' ? ' ← SERVING NOW' : '';
    console.log(`  ${String(idx + 1).padStart(2)}. #${String(t.tokenNumber).padStart(2)} | ${tag} | sortOrder: ${String(t.sortOrder).padStart(8)} | ${t.studentEmail}${srv}`);
  });
  console.log('======================================');
  console.log('Expected order:');
  console.log('  pre-9 walk-ins → 9:00 slot users → 9–10 walk-ins → 10:00 slot users → 10–11 walk-ins');

  console.log('\n========== DEMO CREDENTIALS ==========');
  console.log('🏢 Organizer:  demo@queueflow.com  /  demo1234');
  console.log('🪟 Counter A:  countera@demo.com   /  counter123');
  console.log('🪟 Counter B:  counterb@demo.com   /  counter123');
  console.log('🪟 Counter C:  counterc@demo.com   /  counter123');
  console.log(`🎫 Room Code:  ${ROOM_CODE}`);
  console.log('🎓 Student:    student@demo.com  (OTP login)');
  console.log('=======================================\n');

  await mongoose.disconnect();
  console.log('Done!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
