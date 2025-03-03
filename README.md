# Discord RPG Bot - Guía de Despliegue en EC2

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
- Cloud-based deployment con EC2

## 📋 Requisitos

- Node.js 20 o superior
- Una cuenta de AWS con acceso a DynamoDB
- Un token de bot de Discord
- Un par de claves SSH para acceder a la instancia EC2

## 🚀 Pasos para Despliegue en EC2

### 1. Preparar la Instancia EC2

1. Lanza una nueva instancia EC2 en AWS:
   - Amazon Linux 2023 AMI
   - t2.micro (capa gratuita) o superior
   - Configura un grupo de seguridad con:
     - SSH (Puerto 22) desde tu IP
     - HTTP (Puerto 80) desde cualquier lugar
     - HTTPS (Puerto 443) desde cualquier lugar

2. Conecta a tu instancia EC2:
```bash
ssh -i "tu-key.pem" ec2-user@tu-instancia-ec2.amazonaws.com
```

### 2. Configurar Variables de Entorno

1. Crea el archivo de variables de entorno:
```bash
sudo nano ~/.bashrc
```

2. Agrega las siguientes variables:
```bash
export DISCORD_TOKEN="tu_token_de_discord"
export AWS_ACCESS_KEY_ID="tu_aws_access_key"
export AWS_SECRET_ACCESS_KEY="tu_aws_secret_key"
export AWS_REGION="tu_aws_region"
```

3. Aplica los cambios:
```bash
source ~/.bashrc
```

### 3. Despliegue Automatizado

1. Ejecuta el script de despliegue:
```bash
curl -o- https://raw.githubusercontent.com/DNDTESTv2/DNDBOTv2/main/deploy.sh | bash
```

El script realizará automáticamente:
- Instalación de Node.js y dependencias
- Clonación del repositorio
- Configuración del entorno
- Inicio del bot

### 4. Verificación

1. Verifica los logs del bot:
```bash
tail -f DNDBOTv2/logs/bot.log
```

2. Para detener el bot:
```bash
kill $(cat DNDBOTv2/bot.pid)
```

### 5. Mantenimiento

1. Actualizar el bot:
```bash
cd DNDBOTv2
git pull
npm install
npm run build
kill $(cat bot.pid)
nohup node dist/index.js > logs/bot.log 2>&1 &
echo $! > bot.pid
```

## 🔍 Solución de Problemas

### Logs y Diagnóstico
- Revisa los logs: `tail -f DNDBOTv2/logs/bot.log`
- Verifica que el proceso esté corriendo: `ps aux | grep node`

### Problemas Comunes
1. **Error de Conexión a Discord**:
   - Verifica el DISCORD_TOKEN
   - Asegúrate de que el bot tenga los permisos correctos

2. **Error de DynamoDB**:
   - Confirma las credenciales de AWS
   - Verifica que las tablas existan en la región correcta

3. **El Bot se Detiene**:
   - Revisa los logs en `logs/bot.log`
   - Reinicia el bot usando los comandos de la sección de mantenimiento

## 🔒 Seguridad

- No compartas tus tokens o credenciales
- Mantén tu instancia EC2 actualizada
- Usa un grupo de seguridad restrictivo
- Realiza backups regulares de la base de datos

## 🏗️ Desarrollo Local

1. Clona el repositorio:
```bash
git clone https://github.com/DNDTESTv2/DNDBOTv2.git
cd DNDBOTv2
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

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en `logs/bot.log`
2. Verifica las credenciales en el archivo `.env`
3. Asegúrate de que las tablas de DynamoDB existan
4. Abre un issue en el repositorio si el problema persiste