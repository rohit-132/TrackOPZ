const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateOTP(length = 6) {
  return Math.floor(100000 + Math.random() * 900000).toString().slice(0, length);
}

async function createTestOTP() {
  console.log('🔧 Creating Test OTP for Test Operator...\n');

  try {
    // Find the test operator
    const operator = await prisma.operator.findUnique({
      where: { phone: '+1234567890' }
    });

    if (!operator) {
      console.log('❌ Test operator not found. Run create-test-operator.js first.');
      return;
    }

    console.log(`✅ Found operator: ${operator.username} (${operator.phone})`);

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    const otpRecord = await prisma.operatorOTP.create({
      data: {
        operatorId: operator.id,
        code: otp,
        expiresAt,
      },
    });

    console.log('\n📱 OTP Details:');
    console.log(`   Code: ${otp}`);
    console.log(`   Expires: ${expiresAt}`);
    console.log(`   OTP ID: ${otpRecord.id}`);

    console.log('\n🎯 To login:');
    console.log('1. Go to: http://localhost:3002/operator-login');
    console.log('2. Enter phone: +1234567890');
    console.log('3. Enter OTP: ' + otp);
    console.log('4. You should see the username and profile image!');

  } catch (error) {
    console.error('❌ Error creating OTP:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestOTP();
