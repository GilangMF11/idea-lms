import { execSync } from 'child_process';

async function main() {
  try {
    console.log('🚀 Starting database setup...');
    
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Push schema to database
    console.log('🔄 Pushing schema to database...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('✅ Database setup completed successfully!');
    console.log('📧 You can now run: npm run db:migrate');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}


main().catch((e) => {
  console.error(e);
  process.exit(1);
});
