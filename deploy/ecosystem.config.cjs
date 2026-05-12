module.exports = {
  apps: [
    {
      name: 'idea-space',
      script: './build/index.js',
      cwd: '/var/www/idea-space',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        ORIGIN: 'https://idea-space.my.id',
        BODY_SIZE_LIMIT: '52428800',  // 50MB dalam bytes
      },
    },
  ],
};
