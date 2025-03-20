#!/bin/bash

echo "🔄 Iniciando actualización del bot..."

# Detener cualquier proceso existente que use el puerto 3000
echo "🔍 Verificando procesos existentes..."
if lsof -i:3000 > /dev/null; then
    echo "🛑 Deteniendo proceso en puerto 3000..."
    fuser -k 3000/tcp
fi

# Detener el bot existente si está corriendo
if [ -f "bot.pid" ]; then
    echo "🛑 Deteniendo el bot actual..."
    kill $(cat bot.pid) 2>/dev/null || true
    rm bot.pid
    # Esperar a que el proceso termine completamente
    sleep 5
fi

# Actualizar código desde GitHub
echo "📥 Descargando cambios del repositorio..."
git fetch origin main
git reset --hard origin/main

# Verificar si las dependencias ya están instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install || {
        echo "❌ Error al instalar dependencias"
        exit 1
    }
else
    echo "✅ Dependencias ya instaladas"
fi

# Limpiar node_modules si es necesario
echo "🧹 Limpiando instalación anterior..."
rm -rf node_modules
rm -f package-lock.json

# Instalar dependencias si hay cambios
echo "📦 Instalando dependencias..."
npm install

# Construir el proyecto
echo "🛠️ Construyendo el proyecto..."
npm run build

# Asegurarse de que el directorio logs existe
mkdir -p logs

# Iniciar el bot
echo "🤖 Iniciando el bot..."
PORT=3001 nohup node dist/index.js > logs/bot.log 2>&1 &
echo $! > bot.pid

echo "✅ Actualización completada!"
echo "Para ver los logs del bot: tail -f logs/bot.log"
echo "Para detener el bot: kill $(cat bot.pid)"
echo "Marco😎"
