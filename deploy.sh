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

# Instalar Node.js y npm si no están instalados
echo "📦 Verificando Node.js y npm..."
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "⚙️ Instalando Node.js y npm..."
    sudo apt-get update
    sudo apt-get install -y curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs git

    # Verificar la instalación
    if ! command -v node &> /dev/null; then
        echo "❌ Error: No se pudo instalar Node.js"
        exit 1
    fi
    if ! command -v npm &> /dev/null; then
        echo "❌ Error: No se pudo instalar npm"
        exit 1
    fi

    echo "✅ Node.js $(node --version) y npm $(npm --version) instalados correctamente"
fi

# Limpiar instalación previa si existe
if [ -d "DNDBOTv2" ]; then
    echo "🧹 Limpiando instalación previa..."
    rm -rf DNDBOTv2
fi

# Clonar el repositorio
echo "📦 Clonando repositorio..."
git clone https://github.com/DNDTESTv2/DNDBOTv2.git || {
    echo "❌ Error al clonar el repositorio"
    exit 1
}
cd DNDBOTv2 || exit 1

# Instalar dependencias
echo "📚 Instalando dependencias..."
npm install || {
    echo "❌ Error al instalar dependencias"
    exit 1
}

# Construir el proyecto
echo "🛠️ Construyendo el proyecto..."
npm run build || {
    echo "❌ Error al construir el proyecto"
    exit 1
}

# Crear directorio para logs si no existe
mkdir -p logs

# Crear archivo .env
echo "🔒 Configurando variables de entorno..."
cat > .env << EOL
DISCORD_TOKEN=${DISCORD_TOKEN}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_REGION=${AWS_REGION}
EOL

# Iniciar el bot
echo "🤖 Iniciando el bot..."
nohup node dist/index.js > logs/bot.log 2>&1 &
echo $! > bot.pid

echo "✅ ¡Despliegue completado!"
echo "Para ver los logs del bot: tail -f logs/bot.log"
echo "Para detener el bot: kill $(cat bot.pid)"