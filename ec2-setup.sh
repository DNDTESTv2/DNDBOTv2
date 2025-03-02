#!/bin/bash

# Limpiar directorio home
rm -rf /home/ubuntu/*

# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x y otras herramientas necesarias
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Verificar instalación
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Clonar el repositorio
cd /home/ubuntu
git clone git@github.com:cenacu/discord-dnd.git
cd discord-dnd

# Instalar dependencias
npm install

# Configurar el servicio systemd
sudo tee /etc/systemd/system/discord-bot.service << EOF
[Unit]
Description=Discord RPG Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/discord-dnd
Environment=NODE_ENV=production
Environment=AWS_REGION=\${AWS_REGION}
Environment=AWS_ACCESS_KEY_ID=\${AWS_ACCESS_KEY_ID}
Environment=AWS_SECRET_ACCESS_KEY=\${AWS_SECRET_ACCESS_KEY}
Environment=DISCORD_TOKEN=\${DISCORD_TOKEN}
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd y habilitar el servicio
sudo systemctl daemon-reload
sudo systemctl enable discord-bot
sudo systemctl start discord-bot

echo "============================================"
echo "✅ Instalación completada."
echo "Para verificar el estado del bot:"
echo "sudo systemctl status discord-bot"
echo "Para ver los logs del bot:"
echo "journalctl -u discord-bot -f"
echo "============================================"