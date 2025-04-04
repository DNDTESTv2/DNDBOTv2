
import { Client, Collection, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

export default function registerEventCommands(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  const eventCommand = new SlashCommandBuilder()
    .setName("evento")
    .setDescription("Crea un nuevo evento (solo administradores)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName("nombre")
        .setDescription("Nombre del evento")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("descripcion")
        .setDescription("Descripción del evento")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("duracion")
        .setDescription("Duración del evento")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("imagen")
        .setDescription("URL de la imagen para el evento")
        .setRequired(false)
    );

  commands.set(eventCommand.name, eventCommand.toJSON());

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "evento") return;

    try {
      const nombre = interaction.options.getString("nombre", true);
      const descripcion = interaction.options.getString("descripcion", true);
      const duracion = interaction.options.getString("duracion", true);
      const imageUrl = interaction.options.getString("imagen");

      const embed = new EmbedBuilder()
        .setTitle(`📅 ${nombre}`)
        .setDescription(descripcion)
        .addFields(
          { name: "Duración", value: duracion, inline: true },
          { name: "Organizador", value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor("#FF9900")
        .setTimestamp();
      
      if (imageUrl) {
        embed.setImage(imageUrl);
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error al crear evento:", error);
      await interaction.reply({
        content: "Hubo un error al crear el evento",
        ephemeral: true
      });
    }
  });
}
