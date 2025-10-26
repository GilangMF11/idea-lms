import { execSync } from 'child_process';

async function main() {
  try {
    console.log('🔄 Resetting database...');
    
    // Reset database
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('✅ Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
