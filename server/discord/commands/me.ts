
import { Client, SlashCommandBuilder, EmbedBuilder, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, MessageFlags } from "discord.js";
import { storage } from "../../storage";

export const meCommand = new SlashCommandBuilder()
  .setName("me")
  .setDescription("Realiza una acción con tu personaje")
  .addStringOption(option =>
    option
      .setName("personaje")
      .setDescription("Nombre del personaje")
      .setRequired(true)
      .setAutocomplete(true))
  .addStringOption(option =>
    option
      .setName("accion")
      .setDescription("La acción que quieres realizar")
      .setRequired(true));

export function setupMeCommand(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  commands.set(meCommand.name, meCommand.toJSON());

  client.on("interactionCreate", async interaction => {
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === "me") {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === "personaje") {
          try {
            const characters = await storage.getCharacters(interaction.guildId!);
            const userCharacters = characters.filter(c => c.userId === interaction.user.id);
            const filtered = userCharacters
              .filter(char => char.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
              .map(char => ({
                name: char.name,
                value: char.name
              }));

            await interaction.respond(filtered.slice(0, 25));
          } catch (error) {
            console.error("Error in autocomplete:", error);
            await interaction.respond([]);
          }
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "me") return;

    try {
      const characterName = interaction.options.getString("personaje", true);
      const action = interaction.options.getString("accion", true);

      const characters = await storage.getCharacters(interaction.guildId!);
      const character = characters.find(
        c => c.userId === interaction.user.id && c.name.toLowerCase() === characterName.toLowerCase()
      );

      if (!character) {
        await interaction.reply({
          content: `No se encontró el personaje "${characterName}" o no eres su propietario.`,
          ephemeral: true
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${character.name}`)
        .setDescription(`*${action}*`)
        .setColor("#9B59B6")
        .setTimestamp();

      if (character.imageUrl) {
        embed.setThumbnail(character.imageUrl);
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error en comando /me:", error);
      await interaction.reply({
        content: "Hubo un error al ejecutar la acción",
        ephemeral: true
      });
    }
  });
}
