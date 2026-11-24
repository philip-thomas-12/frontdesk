import { PrismaClient } from '@prisma/client';
import { resetAndSeedDemoTickets } from '../src/utils/startupSeed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executing Frontdesk database seed...');
  const result = await resetAndSeedDemoTickets();
  console.log(`🎉 Seeding complete. Active tickets: ${result.ticketCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
