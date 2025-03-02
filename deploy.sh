#!/bin/bash

# Script de despliegue para EC2
echo "🚀 Iniciando despliegue del bot Discord..."

# Verificar variables de entorno
if [ -z "$DISCORD_TOKEN" ] || [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_REGION" ]; then
    echo "❌ Error: Faltan variables de entorno requeridas"
    echo "Por favor, asegúrate de tener configuradas las siguientes variables:"
    echo "- DISCORD_TOKEN"
    echo "- AWS_ACCESS_KEY_ID"
    echo "- AWS_SECRET_ACCESS_KEY"
    echo "- AWS_REGION"
    exit 1
fi

# Limpiar instalación previa si existe
if [ -d "DndBot" ]; then
    echo "🧹 Limpiando instalación previa..."
    rm -rf DndBot
fi

# Configuración temporal de credenciales Git
echo "🔐 Configurando credenciales temporales..."
if [ -n "$GIT_USERNAME" ] && [ -n "$GIT_TOKEN" ]; then
    git config --global credential.helper store
    echo "https://$GIT_USERNAME:$GIT_TOKEN@github.com" > ~/.git-credentials
    chmod 600 ~/.git-credentials
fi

# Clonar el repositorio
echo "📦 Clonando repositorio..."
git clone https://github.com/DNDTESTv2/DndBot.git || {
    echo "❌ Error al clonar el repositorio"
    exit 1
}
cd DndBot || exit 1

# Instalar dependencias
echo "📚 Instalando dependencias..."
npm install || {
    echo "❌ Error al instalar dependencias"
    exit 1
}
npm install -g pm2 || {
    echo "❌ Error al instalar PM2"
    exit 1
}

# Crear archivo .env
echo "🔒 Configurando variables de entorno..."
cat > .env << EOL
DISCORD_TOKEN=${DISCORD_TOKEN}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_REGION=${AWS_REGION}
EOL

# Construir el proyecto
echo "🛠️ Construyendo el proyecto..."
npm run build || {
    echo "❌ Error al construir el proyecto"
    exit 1
}

# Configurar PM2
echo "⚙️ Configurando PM2..."
pm2 start ecosystem.config.js || {
    echo "❌ Error al iniciar el bot con PM2"
    exit 1
}
pm2 save || {
    echo "❌ Error al guardar la configuración de PM2"
    exit 1
}
pm2 startup || {
    echo "❌ Error al configurar el inicio automático de PM2"
    exit 1
}

echo "✅ ¡Despliegue completado!"
echo "Para ver los logs del bot: pm2 logs discord-dnd-bot"