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

## Configuración

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
```
DISCORD_TOKEN=tu_token_de_discord
AWS_ACCESS_KEY_ID=tu_aws_access_key
AWS_SECRET_ACCESS_KEY=tu_aws_secret_key
AWS_REGION=tu_aws_region
```

4. Inicia el bot:
```bash
npm run dev
```

## Comandos Disponibles

- `/crear-personaje` - Crea un nuevo personaje
- `/listar-personajes` - Muestra todos tus personajes
- `/editar-personaje` - Modifica un personaje existente
- `/trabajar` - Gana monedas trabajando (máx. 100)
- `/robar` - Intenta robar monedas a otro usuario (máx. 10)

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría hacer.

## Licencia

Este proyecto está licenciado bajo MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
