import { Client, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

export default function registerMiscCommands(
  client: Client, 
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  // Los comandos ping y hola han sido eliminados

  // No hay comandos para registrar en esta categoría

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Los manejadores de comandos ping y hola han sido eliminados
  });
}