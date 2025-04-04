import { Client, SlashCommandBuilder, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { storage } from "../../storage";

export default function registerReputationCommands(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  const darReputacion = new SlashCommandBuilder()
    .setName("dar-reputacion")
    .setDescription("Da puntos de reputación a un usuario")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario al que dar reputación")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad de puntos a dar")
        .setRequired(true));

  const verReputacion = new SlashCommandBuilder()
    .setName("ver-reputacion")
    .setDescription("Muestra la reputación de un usuario")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario del que ver la reputación")
        .setRequired(true));

  const quitarReputacion = new SlashCommandBuilder()
    .setName("quitar-reputacion")
    .setDescription("Quita reputación a un usuario (solo administradores)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario al que quitar reputación")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad de reputación a quitar")
        .setRequired(true)
        .setMinValue(1));

  const ranking = new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Muestra el ranking de reputación de los usuarios");

  // Registrar los comandos
  commands.set(darReputacion.name, darReputacion.toJSON());
  commands.set(quitarReputacion.name, quitarReputacion.toJSON());
  commands.set(verReputacion.name, verReputacion.toJSON());
  commands.set(ranking.name, ranking.toJSON());

  // Manejar las interacciones
  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
      case "dar-reputacion": {
        const user = interaction.options.getUser("usuario");
        const points = interaction.options.getInteger("cantidad");

        if (!user || !points) {
          await interaction.reply({
            content: "Por favor, especifica un usuario y una cantidad válida.",
            ephemeral: true
          });
          return;
        }

        const newPoints = await storage.addReputation(interaction.guildId!, user.id, points);

        await interaction.reply({
          content: `Se han agregado ${points} puntos de reputación a ${user}. Nueva reputación total: ${newPoints}`,
          ephemeral: false
        });
        break;
      }

      case "ver-reputacion": {
        const user = interaction.options.getUser("usuario");
        const points = await storage.getReputation(interaction.guildId!, user.id);

        const embed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle("🏆 Puntos de Reputación")
          .setDescription(`${user} tiene **${points}** puntos de reputación`);

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "quitar-reputacion": {
        const targetUser = interaction.options.getUser("usuario");
        const amount = interaction.options.getInteger("cantidad");

        if (!targetUser || !amount) {
          await interaction.reply({
            content: "Por favor, especifica un usuario y una cantidad válida.",
            ephemeral: true
          });
          return;
        }

        const newPoints = await storage.removeReputation(interaction.guildId!, targetUser.id, amount);

        const embed = new EmbedBuilder()
          .setTitle("Reputación Quitada")
          .setDescription(`Se han quitado ${amount} puntos de reputación a ${targetUser}`)
          .setColor("#FF0000");

        await interaction.reply({ embeds: [embed] });
        break;
      }
      case "ranking": {
        const rankedUsers = await storage.getAllReputationRanking(interaction.guildId!);

        if (!rankedUsers || rankedUsers.length === 0) {
          await interaction.reply({ content: "No hay usuarios con reputación." });
          return;
        }

        const ranked = await Promise.all(
          rankedUsers.map(async (user, index) => {
            const member = await interaction.guild?.members.fetch(user.userId);
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "•";
            const displayName = member?.nickname || member?.displayName || user.userId;
            return `${medal} ${displayName}: ${user.points} puntos`;
          })
        );

        const embed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle("🏆 Ranking de Reputación")
          .setDescription(ranked.join("\n"));

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  });
}