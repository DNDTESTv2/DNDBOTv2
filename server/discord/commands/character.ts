import { Client, SlashCommandBuilder, EmbedBuilder, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, MessageFlags } from "discord.js";
import { storage } from "../../storage";

export default function registerCharacterCommands(
  client: Client, 
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
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
        .setRequired(true)
        .addChoices(
          { name: 'Acompañante', value: 'acompanante' },
          { name: 'Dhamphiro', value: 'dhamphiro' },
          { name: 'Draconido', value: 'draconido' },
          { name: 'Draconido Cromatico', value: 'draconido_cromatico' },
          { name: 'Draconido Gema', value: 'draconido_gema' },
          { name: 'Draconido Metalico', value: 'draconido_metalico' },
          { name: 'Elfo', value: 'elfo' },
          { name: 'Enano', value: 'enano' },
          { name: 'Gnomo', value: 'gnomo' },
          { name: 'Humano', value: 'humano' },
          { name: 'Linaje Personalizado', value: 'linaje_personalizado' },
          { name: 'Mediano', value: 'mediano' },
          { name: 'Renacido', value: 'renacido' },
          { name: 'Sangre Malefica', value: 'sangre_malefica' },
          { name: 'Semielfo', value: 'semielfo' },
          { name: 'Semiorco', value: 'semiorco' },
          { name: 'Tiefling', value: 'tiefling' },
          { name: 'Tiefling Variante', value: 'tiefling_variante' }
        ))
    .addStringOption(option =>
      option.setName("rango")
        .setDescription("Rango del personaje")
        .setRequired(true)
        .addChoices(
          { name: 'Rango E', value: 'Rango E' },
          { name: 'Rango D', value: 'Rango D' },
          { name: 'Rango C', value: 'Rango C' },
          { name: 'Rango B', value: 'Rango B' },
          { name: 'Rango A', value: 'Rango A' }
        ))
    .addStringOption(option =>
      option.setName("imagen")
        .setDescription("URL de la imagen del personaje")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("n20")
        .setDescription("URL adicional para N20")
        .setRequired(false));

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

  const editCharacterCommand = new SlashCommandBuilder()
    .setName("editar-personaje")
    .setDescription("Edita el nivel o rango de uno de tus personajes")
    .addStringOption(option =>
      option
        .setName("nombre")
        .setDescription("Nombre del personaje a editar")
        .setRequired(true)
        .setAutocomplete(true))
    .addIntegerOption(option =>
      option.setName("nivel")
        .setDescription("Nuevo nivel del personaje")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(20))
    .addStringOption(option =>
      option.setName("rango")
        .setDescription("Nuevo rango del personaje")
        .setRequired(true)
        .addChoices(
          { name: 'Rango E', value: 'Rango E' },
          { name: 'Rango D', value: 'Rango D' },
          { name: 'Rango C', value: 'Rango C' },
          { name: 'Rango B', value: 'Rango B' },
          { name: 'Rango A', value: 'Rango A' }
        ));

  commands.set(createCharacterCommand.name, createCharacterCommand.toJSON());
  commands.set(viewCharactersCommand.name, viewCharactersCommand.toJSON());
  commands.set(deleteCharacterCommand.name, deleteCharacterCommand.toJSON());
  commands.set(editCharacterCommand.name, editCharacterCommand.toJSON());

  client.on("interactionCreate", async interaction => {
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === "editar-personaje") {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === "nombre") {
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

    if (interaction.commandName === "crear-personaje") {
      try {
        const name = interaction.options.getString("nombre", true);
        const level = interaction.options.getInteger("nivel", true);
        const characterClass = interaction.options.getString("clase", true);
        const race = interaction.options.getString("raza", true);
        const rank = interaction.options.getString("rango", true);
        const imageUrl = interaction.options.getString("imagen") || null; 
        const n20Url = interaction.options.getString("n20") || null; 

        const character = await storage.createCharacter({
          guildId: interaction.guildId!,
          userId: interaction.user.id,
          name,
          level,
          class: characterClass,
          race,
          rank,
          imageUrl,
          n20Url
        });

        const embed = new EmbedBuilder()
          .setTitle(`¡Personaje creado!`)
          .setDescription(`**${name}** ha sido agregado a tu colección.`)
          .addFields(
            { name: 'Nivel', value: level.toString(), inline: true },
            { name: 'Clase', value: characterClass, inline: true },
            { name: 'Raza', value: race, inline: true },
            { name: 'Rango', value: rank, inline: true },
            { name: 'N20', value: `[Ver en N20](${n20Url})`, inline: false }
          )
          .setTimestamp()
          .setColor('#00ff00')
          .setImage(imageUrl);

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Error al crear personaje:", error);
        await interaction.reply({
          content: "Hubo un error al crear el personaje. Asegúrate de proporcionar URLs válidas para la imagen y N20.",
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (interaction.commandName === "ver-personajes") {
      try {
        const characters = await storage.getCharacters(interaction.guildId!);
        const userCharacters = characters.filter(c => c.userId === interaction.user.id);

        if (userCharacters.length === 0) {
          await interaction.reply({
            content: `${interaction.user.username} no tiene personajes creados aún.`
          });
          return;
        }

        const embeds = userCharacters.map(char => {
          const embed = new EmbedBuilder()
            .setTitle(char.name)
            .addFields(
              { name: 'Clase', value: char.class, inline: true },
              { name: 'Raza', value: char.race, inline: true },
              { name: 'Nivel', value: char.level.toString(), inline: true },
              { name: 'Rango', value: char.rank, inline: true },
              { name: 'Creado', value: char.createdAt.toLocaleDateString(), inline: true }
            )
            .setTimestamp()
            .setColor('#0099ff');

          if (char.imageUrl) {
            embed.setImage(char.imageUrl);
          }

          if (char.n20Url) {
            embed.addFields({ name: 'N20', value: `[Ver en N20](${char.n20Url})`, inline: false });
          }

          return embed;
        });

        await interaction.reply({
          content: `**Personajes de ${interaction.user.username}** (${userCharacters.length}):`,
          embeds: embeds
        });
      } catch (error) {
        console.error("Error al obtener personajes:", error);
        await interaction.reply({
          content: "Hubo un error al obtener los personajes",
          flags: MessageFlags.Ephemeral
        });
      }
    }


    if (interaction.commandName === "eliminar-personaje") {
      try {
        const name = interaction.options.getString("nombre", true);
        const characters = await storage.getCharacters(interaction.guildId!);
        const character = characters.find(
          c => c.userId === interaction.user.id && c.name.toLowerCase() === name.toLowerCase()
        );

        if (!character) {
          await interaction.reply({
            content: `No se encontró ningún personaje con el nombre "${name}" o no eres su propietario.`,
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await storage.deleteCharacter(character.id);

        const embed = new EmbedBuilder()
          .setTitle(`Personaje eliminado`)
          .setDescription(`**${character.name}** ha sido eliminado de tu colección.`)
          .setColor('#ff0000')
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error("Error al eliminar personaje:", error);
        await interaction.reply({
          content: "Hubo un error al eliminar el personaje",
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (interaction.commandName === "editar-personaje") {
      try {
        const name = interaction.options.getString("nombre", true);
        const newLevel = interaction.options.getInteger("nivel");
        const newRank = interaction.options.getString("rango");

        const characters = await storage.getCharacters(interaction.guildId!);
        const character = characters.find(
          c => c.userId === interaction.user.id && c.name.toLowerCase() === name.toLowerCase()
        );

        if (!character) {
          await interaction.reply({
            content: `No se encontró ningún personaje con el nombre "${name}" o no eres su propietario.`,
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const updatedCharacter = await storage.updateCharacter(character.id, {
          ...(newLevel && { level: newLevel }),
          ...(newRank && { rank: newRank })
        });

        const embed = new EmbedBuilder()
          .setTitle(`Personaje actualizado`)
          .setDescription(`**${character.name}** ha sido actualizado.`)
          .addFields(
            ...(newLevel ? [
              { name: 'Nivel anterior', value: character.level.toString(), inline: true },
              { name: 'Nivel nuevo', value: newLevel.toString(), inline: true }
            ] : []),
            ...(newRank ? [
              { name: 'Rango anterior', value: character.rank, inline: true },
              { name: 'Rango nuevo', value: newRank, inline: true }
            ] : [])
          )
          .setColor('#00ff00')
          .setTimestamp();

        if (character.imageUrl) {
          embed.setImage(character.imageUrl);
        }

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Error al editar personaje:", error);
        await interaction.reply({
          content: "Hubo un error al editar el personaje",
          flags: MessageFlags.Ephemeral
        });
      }
    }
  });
}