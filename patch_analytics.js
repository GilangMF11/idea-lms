import { prisma } from './src/lib/database.js';

async function test() {
  const dt = new Date();
  dt.setDate(dt.getDate() - 7);
  const users = await prisma.user.findMany({where:{createdAt: {gte: dt}}, select:{createdAt:true}});
  console.log(users.length);
}
test().catch(console.error);
