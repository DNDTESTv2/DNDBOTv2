
import { Client, Collection, SlashCommandBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

export function configureMiscCommands(
  client: Client, 
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  // No registramos los comandos ping y hola
  
  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    // Sin manejadores para ping y hola
  });
}
