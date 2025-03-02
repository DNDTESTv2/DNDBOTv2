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

# Generar clave SSH sin email asociado
echo "Generando clave SSH para deploy..."
mkdir -p /home/ubuntu/.ssh
ssh-keygen -t ed25519 -f /home/ubuntu/.ssh/github_deploy -N ""
chmod 600 /home/ubuntu/.ssh/github_deploy*

# Configurar SSH para usar la clave con GitHub
cat > /home/ubuntu/.ssh/config << EOF
Host github.com
  IdentityFile /home/ubuntu/.ssh/github_deploy
  User git
EOF
chmod 600 /home/ubuntu/.ssh/config

# Mostrar la clave pública para añadirla en GitHub
echo "===================================================="
echo "CLAVE SSH PÚBLICA (añadir como deploy key en GitHub):"
echo "===================================================="
cat /home/ubuntu/.ssh/github_deploy.pub
echo "===================================================="
echo "Después de añadir esta clave en GitHub, presiona Enter para continuar..."
read -p ""

# Clonar el repositorio
cd /home/ubuntu
GIT_SSH_COMMAND="ssh -i /home/ubuntu/.ssh/github_deploy -o StrictHostKeyChecking=accept-new" git clone git@github.com:cenacu/discord-dnd.git
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
echo ""
echo "📝 La clave SSH generada está en:"
echo "  - Privada: /home/ubuntu/.ssh/github_deploy"
echo "  - Pública: /home/ubuntu/.ssh/github_deploy.pub"
echo "============================================"