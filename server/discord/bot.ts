import { Client, Events, GatewayIntentBits, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, REST, Routes } from "discord.js";
import { registerAdminCommands, hardReset, handleHardReset } from "./commands/admin";
import registerCurrencyCommands from "./commands/currency";
import registerCharacterCommands from "./commands/character";
import registerMoneyCommands from "./commands/money";
import registerEventCommands from "./commands/event";
import { setupMeCommand } from "./commands/me";
import configureShopCommands from "./commands/shop";
import registerDiceCommands from "./commands/dice";
import registerWeatherCommands from "./commands/weather";
import registerReputationCommands from "./commands/reputation";

export function setupBot(token: string) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  const commands = new Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>();

  // Registrar comandos en la colección
  registerMoneyCommands(client, commands);
  registerEventCommands(client, commands);
  configureShopCommands(client, commands);
  registerDiceCommands(client, commands);
  registerCurrencyCommands(client, commands);
  registerWeatherCommands(client, commands);
  registerReputationCommands(client, commands);

  setupMeCommand(client, commands);
  registerAdminCommands(client, commands);
  registerCharacterCommands(client, commands);

  // Registrar comandos una sola vez al iniciar
  client.once(Events.ClientReady, async (c) => {
    console.log(`¡Bot listo! Conectado como ${c.user?.tag}`);
    console.log(`Link de invitación: https://discord.com/api/oauth2/authorize?client_id=${c.user?.id}&permissions=2147485696&scope=bot%20applications.commands`);

    try {
      const rest = new REST().setToken(client.token!);
      console.log('Iniciando registro de comandos...');

      // Registrar comandos globalmente para la aplicación
      await rest.put(
        Routes.applicationCommands(c.user.id),
        { body: Array.from(commands.values()) }
      );

      console.log("✓ Bot listo para recibir comandos");
    } catch (error) {
      console.error('Error registrando comandos:', error);
    }
  });

  client.on('guildCreate', async (guild) => {
    console.log(`Bot añadido al servidor: ${guild.name}`);
  });

  // Event handlers
  client.login(token);
  return client;
}