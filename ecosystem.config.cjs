module.exports = {
  apps: [{
    name: 'sonsecha-startup-web',
    script: './server.mjs',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: '40330',
    },
  }],
};
