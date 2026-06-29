module.exports = {
  apps: [
    {
      name: 'party-games',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3035',
      },
    },
  ],
}
