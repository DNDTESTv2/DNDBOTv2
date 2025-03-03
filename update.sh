#!/bin/bash

echo "🔄 Iniciando actualización del bot..."

# Actualizar código desde GitHub
echo "📥 Descargando cambios del repositorio..."
git fetch origin main
git reset --hard origin/main

# Instalar dependencias si hay cambios
echo "📦 Instalando dependencias..."
npm install

# Construir el proyecto
echo "🛠️ Construyendo el proyecto..."
npm run build

# Detener el bot existente si está corriendo
if [ -f "bot.pid" ]; then
    echo "🛑 Deteniendo el bot actual..."
    kill $(cat bot.pid) 2>/dev/null || true
    rm bot.pid
fi

# Iniciar el bot
echo "🤖 Iniciando el bot..."
nohup node dist/index.js > logs/bot.log 2>&1 &
echo $! > bot.pid

echo "✅ Actualización completada!"
echo "Para ver los logs del bot: tail -f logs/bot.log"
echo "Para detener el bot: kill $(cat bot.pid)"