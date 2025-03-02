module.exports = {
  apps: [{
    name: "discord-dnd-bot",
    script: "dist/index.js",
    watch: false,
    env: {
      NODE_ENV: "production",
    },
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    time: true,
    max_memory_restart: "1G",
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    autorestart: true,
    instances: 1,
    exec_mode: "fork",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z"
  }]
}