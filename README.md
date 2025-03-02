# Bot de Discord para Juegos de Rol

Bot avanzado para comunidades de juegos de rol, especializado en creación y gestión de personajes con amplia personalización.

## Características

- Sistema de creación de personajes con múltiples razas y clases
- Sistema de economía y comercio
- Gestión de inventario
- Comandos de rol y aventura
- Soporte para personalización detallada de personajes

## Requisitos

- Node.js 20 o superior
- Una cuenta de AWS con acceso a DynamoDB
- Un token de bot de Discord
- PM2 (para gestión de procesos en producción)

## Configuración Local

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd <nombre-del-repositorio>
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
Crea un archivo `.env` en la raíz del proyecto con:
```env
DISCORD_TOKEN=tu_token_de_discord
AWS_ACCESS_KEY_ID=tu_aws_access_key
AWS_SECRET_ACCESS_KEY=tu_aws_secret_key
AWS_REGION=tu_aws_region
```

4. Inicia el bot en modo desarrollo:
```bash
npm run dev
```

## Despliegue en Amazon EC2

### 1. Preparación de la Instancia EC2

1. Conéctate a tu instancia EC2:
```bash
ssh -i "tu-key.pem" ec2-user@tu-instancia-ec2.amazonaws.com
```

2. Actualiza el sistema e instala Node.js 20:
```bash
# Actualizar el sistema
sudo yum update -y

# Instalar Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verificar la instalación
node --version
npm --version
```

3. Instala Git:
```bash
sudo yum install -y git
```

### 2. Configuración del Proyecto

1. Clona el repositorio (si usas GitHub):
```bash
git clone https://github.com/tu-usuario/tu-repositorio.git
cd tu-repositorio
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
# Crear y editar el archivo .env
nano .env

# Añade las siguientes variables (reemplaza con tus valores)
DISCORD_TOKEN=tu_token_de_discord
AWS_ACCESS_KEY_ID=tu_aws_access_key
AWS_SECRET_ACCESS_KEY=tu_aws_secret_key
AWS_REGION=tu_aws_region
```

### 3. Configuración de PM2

1. Instala PM2 globalmente:
```bash
npm install -g pm2
```

2. Construye el proyecto:
```bash
npm run build
```

3. Inicia el bot con PM2:
```bash
# Iniciar el bot
pm2 start ecosystem.config.js

# Guardar la configuración de PM2
pm2 save

# Configurar el inicio automático
pm2 startup
```

### 4. Gestión del Bot

Comandos útiles de PM2 para gestionar el bot:

```bash
# Ver el estado del bot
pm2 status

# Ver los logs en tiempo real
pm2 logs discord-dnd-bot

# Reiniciar el bot
pm2 restart discord-dnd-bot

# Detener el bot
pm2 stop discord-dnd-bot

# Iniciar el bot
pm2 start discord-dnd-bot
```

### 5. Actualización del Bot

Para actualizar el bot a una nueva versión:

```bash
# Detener el bot
pm2 stop discord-dnd-bot

# Actualizar el código (si usas git)
git pull

# Instalar nuevas dependencias si las hay
npm install

# Reconstruir el proyecto
npm run build

# Reiniciar el bot
pm2 restart discord-dnd-bot
```

## Comandos del Bot

- `/crear-personaje` - Crea un nuevo personaje
- `/listar-personajes` - Muestra todos tus personajes
- `/editar-personaje` - Modifica un personaje existente
- `/trabajar` - Gana monedas trabajando (máx. 100)
- `/robar` - Intenta robar monedas a otro usuario (máx. 10)

## Solución de Problemas

1. Si el bot no se conecta, verifica:
   - El token de Discord en el archivo .env
   - Las credenciales de AWS en el archivo .env
   - Los logs usando `pm2 logs discord-dnd-bot`

2. Si hay problemas con DynamoDB:
   - Verifica que las tablas existan en la consola de AWS
   - Confirma que las credenciales de AWS tengan los permisos necesarios
   - Revisa los logs en busca de errores específicos


## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría hacer.

## Licencia

Este proyecto está licenciado bajo MIT - ver el archivo [LICENSE](LICENSE) para más detalles.