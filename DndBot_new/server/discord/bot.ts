import { Client, Events, GatewayIntentBits, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { registerAdminCommands } from "./commands/admin";
import registerCurrencyCommands from "./commands/currency";
import registerCharacterCommands from "./commands/character";
import registerMoneyCommands from "./commands/money";
import { hardReset, handleHardReset } from "./commands/admin";

export function setupBot(token: string) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  const commands = new Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>();

  registerAdminCommands(client, commands);
  registerCurrencyCommands(client, commands);
  registerCharacterCommands(client, commands);
  registerMoneyCommands(client, commands);
  commands.set(hardReset.name, hardReset.toJSON());

  client.once(Events.ClientReady, async c => {
    console.log(`¡Bot listo! Conectado como ${c.user?.tag}`);
    console.log(`Link de invitación: https://discord.com/api/oauth2/authorize?client_id=${c.user?.id}&permissions=2147485696&scope=bot%20applications.commands`);

    try {
      // Registrar comandos en cada guild usando Array.from() para evitar el error de iteración
      for (const guild of Array.from(client.guilds.cache.values())) {
        try {
          const registeredCommands = await guild.commands.set(
            Array.from(commands.values())
          );
          console.log(`✅ Comandos registrados en ${guild.name} (${registeredCommands.size} comandos)`);
        } catch (error) {
          console.error(`❌ Error al registrar comandos en ${guild.name}:`, error);
        }
      }
    } catch (error) {
      console.error("Error general al registrar comandos:", error);
    }
  });

  // Registrar comandos al unirse a un nuevo servidor
  client.on(Events.GuildCreate, async guild => {
    try {
      const registeredCommands = await guild.commands.set(
        Array.from(commands.values())
      );
      console.log(`✅ Comandos registrados en nuevo servidor ${guild.name} (${registeredCommands.size} comandos)`);
    } catch (error) {
      console.error(`❌ Error al registrar comandos en nuevo servidor ${guild.name}:`, error);
    }
  });

  // Add hard-reset command handler
  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "hard-reset") {
      await handleHardReset(interaction);
    }
  });

  client.login(token);
  return client;
}