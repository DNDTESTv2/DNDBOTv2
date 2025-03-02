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
    time: true
  }]
}
