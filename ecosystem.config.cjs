module.exports = {
  apps: [{
    name: 'sonsecha-startup-web',
    script: './run-production.sh',
    interpreter: 'bash',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: '40330',
      TRUSTED_PROXY_IPS: '192.168.45.23',
    },
  }],
};
