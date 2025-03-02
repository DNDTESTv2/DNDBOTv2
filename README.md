# Discord RPG Bot

Bot de Discord avanzado para comunidades de juegos de rol, especializado en creación y gestión de personajes con amplia personalización.

## Configuración en EC2

Para configurar el bot en una instancia EC2 de AWS, sigue estos pasos:

1. Conéctate a tu instancia EC2:
```bash
ssh -i "tu-key.pem" ubuntu@tu-ec2-dns.amazonaws.com
```

2. Genera una nueva clave SSH:
```bash
ssh-keygen -t ed25519 -C "tu-email@ejemplo.com"
cat ~/.ssh/id_ed25519.pub
```

3. Agrega la clave pública como Deploy Key en GitHub:
   - Ve a tu repositorio en GitHub
   - Settings > Deploy Keys > Add deploy key
   - Pega la clave pública y marca "Allow write access"

4. Ejecuta el script de configuración:
```bash
curl -O https://raw.githubusercontent.com/cenacu/discord-dnd/main/ec2-setup.sh && chmod +x ec2-setup.sh && ./ec2-setup.sh
```

## Variables de Entorno Necesarias

El bot requiere las siguientes variables de entorno:
- `DISCORD_TOKEN`: Token de tu bot de Discord
- `AWS_REGION`: Región de AWS donde está tu DynamoDB
- `AWS_ACCESS_KEY_ID`: ID de clave de acceso de AWS
- `AWS_SECRET_ACCESS_KEY`: Clave secreta de acceso de AWS

## Comandos Útiles

- Verificar estado del bot: `sudo systemctl status discord-bot`
- Ver logs en tiempo real: `journalctl -u discord-bot -f`
- Reiniciar el bot: `sudo systemctl restart discord-bot`
