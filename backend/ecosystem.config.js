module.exports = {
  apps: [{
    name: 'fintech-wallet-api',
    script: 'server.js',
    instances: 'max',          // Automatically scale across all available CPU cores
    exec_mode: 'cluster',      // Enable Node.js cluster mode for horizontal scaling
    autorestart: true,         // Automatically restart the application if it crashes
    watch: false,              // Keep disabled in production to prevent unintended restarts
    max_memory_restart: '1G',  // Restart process if memory allocation exceeds 1GB
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
