import { Client, Collection, REST, Routes, SlashCommandBuilder } from "discord.js";
import { configureCharacterCommands } from "./character";
import { configureMoneyCommands } from "./money";

export async function registerCommands(client: Client, token: string, clientId: string) {
  const commands = new Collection<string, any>();

  // Configurar comandos de personajes
  await configureCharacterCommands(client, commands);

  // Configurar comandos de moneda
  await configureMoneyCommands(client, commands);

  // Registrar todos los comandos con la API de Discord
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log("Comenzando a refrescar comandos (/)");

    // Registrar comandos globalmente
    await rest.put(Routes.applicationCommands(clientId), {
      body: Array.from(commands.values()),
    });

    console.log("Comandos (/) refrescados exitosamente");
  } catch (error) {
    console.error(error);
  }
}