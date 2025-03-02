# Discord RPG Bot

Bot avanzado de Discord para comunidades de juegos de rol, con gestión de personajes, economía y más.

## 🎯 Características

- Sistema de creación y gestión de personajes
- Sistema de economía y comercio
- Gestión de inventario
- Comandos de rol y aventura
- Personalización detallada de personajes

## 🛠️ Tecnologías

- Discord.js para integración con Discord
- TypeScript para backend y frontend
- Express para el servidor web
- AWS DynamoDB para almacenamiento
- React para el panel de administración
- PM2 para gestión de procesos

## 📋 Requisitos

- Node.js 20 o superior
- Una cuenta de AWS con acceso a DynamoDB
- Un token de bot de Discord
- PM2 (para producción)

## 🚀 Despliegue Rápido

1. Configura las variables de entorno necesarias:
```bash
export DISCORD_TOKEN="tu_token_de_discord"
export AWS_ACCESS_KEY_ID="tu_aws_access_key"
export AWS_SECRET_ACCESS_KEY="tu_aws_secret_key"
export AWS_REGION="tu_aws_region"
```

2. Ejecuta el script de despliegue automatizado:
```bash
curl -o- https://raw.githubusercontent.com/DNDTESTv2/DndBot/main/deploy.sh | bash
```

El script se encargará de:
- Instalar Node.js y dependencias necesarias
- Clonar el repositorio
- Configurar el entorno
- Iniciar el bot con PM2

## 🏗️ Desarrollo Local

1. Clona el repositorio:
```bash
git clone https://github.com/DNDTESTv2/DndBot.git
cd DndBot
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno en un archivo `.env`:
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

## 📚 Comandos del Bot

### Personajes
- `/crear-personaje` - Crea un nuevo personaje
- `/listar-personajes` - Muestra todos tus personajes
- `/editar-personaje` - Modifica un personaje existente

### Economía
- `/balance` - Muestra tu balance actual
- `/trabajar` - Gana monedas trabajando
- `/transferir` - Transfiere monedas a otro usuario
- `/robar` - Intenta robar monedas (con riesgo)

### Administración
- `/agregar-dinero` - (Admin) Agrega dinero a un usuario
- `/descontar-dinero` - (Admin) Descuenta dinero de un usuario

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Añade nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está licenciado bajo MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Si encuentras algún problema:

1. Revisa los logs usando `pm2 logs discord-dnd-bot`
2. Verifica las credenciales en el archivo `.env`
3. Asegúrate de que las tablas de DynamoDB existan y tengan los permisos correctos
4. Abre un issue en el repositorio si el problema persiste