#!/bin/bash

# Script de despliegue para EC2
echo "🚀 Iniciando despliegue del bot Discord..."

# Verificar variables de entorno
REQUIRED_VARS=("DISCORD_TOKEN" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "AWS_REGION")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "❌ Error: La variable de entorno $VAR no está configurada."
        exit 1
    fi
done

# Verificar e instalar Node.js y npm si no están instalados
echo "📦 Verificando Node.js y npm..."
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "⚙️ Instalando Node.js y npm..."
    sudo apt-get update && sudo apt-get install -y curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs git

    # Verificar instalación
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo "❌ Error: No se pudo instalar Node.js o npm"
        exit 1
    fi

    echo "✅ Node.js $(node --version) y npm $(npm --version) instalados correctamente"
fi

# Limpiar instalación previa y clonar el repositorio
echo "🧹 Limpiando instalación previa..."
rm -rf DNDBOTv2 && git clone https://github.com/DNDTESTv2/DNDBOTv2.git || {
    echo "❌ Error al clonar el repositorio"
    exit 1
}
cd DNDBOTv2 || exit 1

# Verificar si las dependencias ya están instaladas
if [ ! -d "node_modules" ]; then
    echo "📚 Instalando dependencias..."
    npm install || {
        echo "❌ Error al instalar dependencias"
        exit 1
    }
else
    echo "✅ Dependencias ya instaladas"
fi

# Construir el proyecto
echo "🛠️ Construyendo el proyecto..."
npm run build || {
    echo "❌ Error al construir el proyecto"
    exit 1
}

# Crear directorio de logs si no existe
mkdir -p logs

# Crear archivo .env
echo "🔒 Configurando variables de entorno..."
rm -f .env  # Elimina el archivo si ya existe
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

# Verificar si el bot se inició correctamente
sleep 2
if ! ps -p $(cat bot.pid) > /dev/null; then
    echo "❌ Error: El bot no se inició correctamente."
    exit 1
fi

echo "✅ ¡Despliegue completado!"
echo "Para ver los logs del bot: tail -f logs/bot.log"
echo "Para detener el bot: kill \$(cat bot.pid)"
echo "Marco😎"
