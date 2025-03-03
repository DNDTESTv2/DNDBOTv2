#!/bin/bash

echo "🔄 Iniciando actualización del bot..."

# Actualizar código desde GitHub
echo "📥 Descargando cambios del repositorio..."
git pull origin main

# Instalar dependencias si hay cambios
echo "📦 Instalando dependencias..."
npm install

# Construir el proyecto
echo "🛠️ Construyendo el proyecto..."
npm run build

# Verificar si el proceso existe en PM2
if pm2 list | grep -q "discord-dnd-bot"; then
    echo "🔄 Reiniciando bot en PM2..."
    pm2 restart discord-dnd-bot --update-env
else
    echo "🆕 Iniciando bot en PM2 por primera vez..."
    pm2 start dist/index.js --name discord-dnd-bot
fi

# Mostrar logs
echo "📋 Mostrando logs del bot..."
pm2 logs discord-dnd-bot --lines 20

echo "✅ Actualización completada!"
