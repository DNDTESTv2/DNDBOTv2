import { Client, SlashCommandBuilder, EmbedBuilder, Collection, MessageFlags } from "discord.js";
import { storage } from "../../storage";
// import { logger } from "../../logger";

export default function registerCharacterCommands(
  client: Client,
  commands: Collection<string, any>
) {
  const createCharacterCommand = new SlashCommandBuilder()
    .setName("crear-personaje")
    .setDescription("Crea una nueva hoja de personaje")
    .addStringOption(option =>
      option.setName("nombre")
        .setDescription("Nombre del personaje")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("nivel")
        .setDescription("Nivel del personaje")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(20))
    .addStringOption(option =>
      option.setName("clase")
        .setDescription("Clase del personaje")
        .setRequired(true)
        .addChoices(
          { name: 'Artifice', value: 'artifice' },
          { name: 'Bárbaro', value: 'barbaro' },
          { name: 'Bardo', value: 'bardo' },
          { name: 'Clérigo', value: 'clerigo' },
          { name: 'Druida', value: 'druida' },
          { name: 'Guerrero', value: 'guerrero' },
          { name: 'Hechicero', value: 'hechicero' },
          { name: 'Mago', value: 'mago' },
          { name: 'Monje', value: 'monje' },
          { name: 'Paladín', value: 'paladin' },
          { name: 'Pícaro', value: 'picaro' },
          { name: 'Explorador', value: 'explorador' }
        ))
    .addStringOption(option =>
      option.setName("raza")
        .setDescription("Raza del personaje")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("rango")
        .setDescription("Rango del personaje")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("imagen")
        .setDescription("URL de la imagen del personaje")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("n20")
        .setDescription("URL adicional para N20")
        .setRequired(true));

  const viewCharactersCommand = new SlashCommandBuilder()
    .setName("ver-personajes")
    .setDescription("Muestra tus personajes creados");

  const deleteCharacterCommand = new SlashCommandBuilder()
    .setName("eliminar-personaje")
    .setDescription("Elimina uno de tus personajes")
    .addStringOption(option =>
      option.setName("nombre")
        .setDescription("Nombre del personaje a eliminar")
        .setRequired(true));

  commands.set(createCharacterCommand.name, createCharacterCommand.toJSON());
  commands.set(viewCharactersCommand.name, viewCharactersCommand.toJSON());
  commands.set(deleteCharacterCommand.name, deleteCharacterCommand.toJSON());

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "eliminar-personaje") {
      try {
        const name = interaction.options.getString("nombre", true);
        const guildId = interaction.guildId;

        if (!guildId) {
          await interaction.reply({ content: "Este comando solo puede ser usado en un servidor.", ephemeral: true });
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        const characters = await storage.getCharacters(guildId);
        const character = characters.find(
          c => c.userId === interaction.user.id && c.name.toLowerCase() === name.toLowerCase()
        );

        if (!character) {
          await interaction.editReply({ content: `No se encontró ningún personaje con el nombre "${name}" o no eres su propietario.` });
          return;
        }

        const success = await storage.deleteCharacter(character.id);

        if (!success) {
          await interaction.editReply({ content: "Hubo un error al eliminar el personaje. Por favor, intenta de nuevo." });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("Personaje eliminado")
          .setDescription(`**${name}** ha sido eliminado de tu colección.`)
          .setColor('#ff0000')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error("Error al eliminar personaje:", error);
        await interaction.editReply({ content: "Hubo un error al procesar el comando. Por favor, intenta de nuevo más tarde." });
      }
    }
  });
}

