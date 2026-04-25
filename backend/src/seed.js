require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Service = require('./models/Service');
const Student = require('./models/Student');
const Token = require('./models/Token');

const services = [
  { name: 'Bonafide', avgServiceTimeMin: 5 },
  { name: 'ID Card',  avgServiceTimeMin: 7 },
  { name: 'Fees',     avgServiceTimeMin: 10 },
];

const fakeStudents = [
  'rahul.sharma@college.edu',
  'priya.patel@college.edu',
  'amit.verma@college.edu',
  'sneha.joshi@college.edu',
  'rohan.mehta@college.edu',
  'anjali.singh@college.edu',
  'vikram.nair@college.edu',
  'pooja.gupta@college.edu',
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Upsert services
  const savedServices = [];
  for (const svc of services) {
    const s = await Service.findOneAndUpdate({ name: svc.name }, svc, { upsert: true, new: true });
    savedServices.push(s);
    console.log(`Upserted service: ${s.name}`);
  }

  // Clear existing tokens
  await Token.deleteMany({});
  console.log('Cleared existing tokens');

  // Reset token sequences
  for (const svc of savedServices) {
    await Service.findByIdAndUpdate(svc._id, { currentTokenSeq: 0 });
  }

  // Upsert fake students
  for (const email of fakeStudents) {
    await Student.findOneAndUpdate({ email }, { email }, { upsert: true, new: true });
  }
  console.log(`Upserted ${fakeStudents.length} students`);

  // Seed tokens for Bonafide: 6 tokens (1 serving, 5 waiting)
  const bonafide = savedServices.find(s => s.name === 'Bonafide');
  const bonafideStudents = fakeStudents.slice(0, 6);
  for (let i = 0; i < bonafideStudents.length; i++) {
    const tokenNumber = i + 1;
    const status = i === 0 ? 'serving' : 'waiting';
    await Token.create({ tokenNumber, studentEmail: bonafideStudents[i], serviceId: bonafide._id, status });
  }
  await Service.findByIdAndUpdate(bonafide._id, { currentTokenSeq: 6 });
  console.log('Seeded 6 tokens for Bonafide');

  // Seed tokens for ID Card: 3 tokens (all waiting)
  const idCard = savedServices.find(s => s.name === 'ID Card');
  const idCardStudents = fakeStudents.slice(2, 5);
  for (let i = 0; i < idCardStudents.length; i++) {
    await Token.create({ tokenNumber: i + 1, studentEmail: idCardStudents[i], serviceId: idCard._id, status: 'waiting' });
  }
  await Service.findByIdAndUpdate(idCard._id, { currentTokenSeq: 3 });
  console.log('Seeded 3 tokens for ID Card');

  // Seed tokens for Fees: 4 tokens (1 serving, 3 waiting)
  const fees = savedServices.find(s => s.name === 'Fees');
  const feesStudents = fakeStudents.slice(4, 8);
  for (let i = 0; i < feesStudents.length; i++) {
    const status = i === 0 ? 'serving' : 'waiting';
    await Token.create({ tokenNumber: i + 1, studentEmail: feesStudents[i], serviceId: fees._id, status });
  }
  await Service.findByIdAndUpdate(fees._id, { currentTokenSeq: 4 });
  console.log('Seeded 4 tokens for Fees');

  await mongoose.disconnect();
  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
