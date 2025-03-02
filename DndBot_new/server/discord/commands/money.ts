import { Client, SlashCommandBuilder, PermissionFlagsBits, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, MessageFlags } from "discord.js";
import { storage } from "../../storage";

export default function registerMoneyCommands(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  const deductMoney = new SlashCommandBuilder()
    .setName("descontar-dinero")
    .setDescription("Descuenta dinero de tu billetera")
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Nombre de la moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad a descontar")
        .setRequired(true)
        .setMinValue(1));

  const addMoney = new SlashCommandBuilder()
    .setName("agregar-dinero")
    .setDescription("Agrega dinero a la billetera de un usuario")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario al que se le agregará el dinero")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Nombre de la moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad a agregar")
        .setRequired(true)
        .setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  commands.set(deductMoney.name, deductMoney.toJSON());
  commands.set(addMoney.name, addMoney.toJSON());

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "descontar-dinero") {
      try {
        const currencyName = interaction.options.getString("moneda", true);
        const amount = interaction.options.getInteger("cantidad", true);

        // Obtener o crear la billetera del usuario
        let wallet = await storage.getUserWallet(interaction.guildId!, interaction.user.id);
        if (!wallet) {
          wallet = await storage.createUserWallet({
            guildId: interaction.guildId!,
            userId: interaction.user.id
          });
        }

        // Verificar si la moneda existe
        const currencies = await storage.getCurrencies(interaction.guildId!);
        const currency = currencies.find(c => c.name === currencyName);
        if (!currency) {
          await interaction.reply({
            content: "Moneda no encontrada",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        // Verificar si tiene suficientes fondos
        const currentBalance = wallet.wallet[currencyName] || 0;
        if (currentBalance < amount) {
          await interaction.reply({
            content: `No tienes suficientes ${currency.symbol} para descontar`,
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        // Actualizar billetera
        const updatedWallet = { ...wallet.wallet };
        updatedWallet[currencyName] = currentBalance - amount;
        await storage.updateUserWallet(wallet.id, updatedWallet);

        // Registrar transacción
        await storage.createTransaction({
          guildId: interaction.guildId!,
          fromUserId: interaction.user.id,
          toUserId: interaction.user.id,
          currencyName,
          amount
        });

        // Enviar confirmación
        await interaction.reply(`Se han descontado ${amount} ${currency.symbol} de tu billetera`);

        // Log transaction if channel is configured
        const settings = await storage.getGuildSettings(interaction.guildId!);
        if (settings?.transactionLogChannel) {
          const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
          if (channel?.isTextBased()) {
            await channel.send(
              `💰 Descuento de dinero:\n` +
              `Usuario: <@${interaction.user.id}>\n` +
              `Cantidad: ${amount} ${currency.symbol}\n` +
              `Fecha: ${new Date().toLocaleString()}`
            );
          }
        }
      } catch (error) {
        console.error("Error al descontar dinero:", error);
        await interaction.reply({
          content: "Hubo un error al descontar el dinero",
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (interaction.commandName === "agregar-dinero") {
      try {
        const targetUser = interaction.options.getUser("usuario", true);
        const currencyName = interaction.options.getString("moneda", true);
        const amount = interaction.options.getInteger("cantidad", true);

        // Obtener o crear la billetera del usuario objetivo
        let wallet = await storage.getUserWallet(interaction.guildId!, targetUser.id);
        if (!wallet) {
          wallet = await storage.createUserWallet({
            guildId: interaction.guildId!,
            userId: targetUser.id
          });
        }

        // Verificar si la moneda existe
        const currencies = await storage.getCurrencies(interaction.guildId!);
        const currency = currencies.find(c => c.name === currencyName);
        if (!currency) {
          await interaction.reply({
            content: "Moneda no encontrada",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        // Actualizar billetera
        const updatedWallet = { ...wallet.wallet };
        updatedWallet[currencyName] = (updatedWallet[currencyName] || 0) + amount;
        await storage.updateUserWallet(wallet.id, updatedWallet);

        // Registrar transacción
        await storage.createTransaction({
          guildId: interaction.guildId!,
          fromUserId: interaction.user.id,
          toUserId: targetUser.id,
          currencyName,
          amount
        });

        // Enviar confirmación
        await interaction.reply(`Se han agregado ${amount} ${currency.symbol} a la billetera de <@${targetUser.id}>`);

        // Log transaction if channel is configured
        const settings = await storage.getGuildSettings(interaction.guildId!);
        if (settings?.transactionLogChannel) {
          const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
          if (channel?.isTextBased()) {
            await channel.send(
              `💰 Agregado de dinero por administrador:\n` +
              `Administrador: <@${interaction.user.id}>\n` +
              `Usuario: <@${targetUser.id}>\n` +
              `Cantidad: ${amount} ${currency.symbol}\n` +
              `Fecha: ${new Date().toLocaleString()}`
            );
          }
        }
      } catch (error) {
        console.error("Error al agregar dinero:", error);
        await interaction.reply({
          content: "Hubo un error al agregar el dinero",
          flags: MessageFlags.Ephemeral
        });
      }
    }
  });
}