
import { Client, SlashCommandBuilder, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, MessageFlags } from "discord.js";

export default function registerDiceCommands(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  const rollCommand = new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Tira uno o más dados")
    .addStringOption((option) =>
      option
        .setName("dados")
        .setDescription("Formato: NdX (ejemplo: 2d20, 3d6)")
        .setRequired(true)
    );

  commands.set(rollCommand.name, rollCommand.toJSON());

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "roll") return;

    try {
      const diceStr = interaction.options.getString("dados", true);
      const match = diceStr.toLowerCase().match(/^(\d+)d(\d+)$/);

      if (!match) {
        await interaction.reply({
          content: "Formato inválido. Usa el formato NdX (ejemplo: 2d20, 3d6)",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const [, count, sides] = match;
      const numDice = parseInt(count);
      const numSides = parseInt(sides);

      if (numDice > 100) {
        await interaction.reply({
          content: "No puedes tirar más de 100 dados a la vez",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const results = [];
      let total = 0;
      for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * numSides) + 1;
        results.push(roll);
        total += roll;
      }

      const response =
        `🎲 Tirando ${numDice}d${numSides}:\n` +
        `Resultados: ${results.join(", ")}\n` +
        `Total: **${total}**`;

      await interaction.reply(response);
    } catch (error) {
      await interaction.reply({
        content: "Hubo un error al tirar los dados",
        flags: MessageFlags.Ephemeral,
      });
    }
  });
}
