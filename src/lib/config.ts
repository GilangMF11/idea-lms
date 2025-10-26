export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/lms_light?schema=public',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    tokenExpiry: '7d',
  },
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    requestLimit: 5,
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
  },
};
