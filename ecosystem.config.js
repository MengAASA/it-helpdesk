// PM2 process definition for production. Usage on the VPS:
//   pm2 start ecosystem.config.js
//   pm2 save                        # persist across reboots
//   pm2 startup                     # one-time: registers PM2 itself to start on boot
module.exports = {
  apps: [
    {
      name: "it-helpdesk",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
