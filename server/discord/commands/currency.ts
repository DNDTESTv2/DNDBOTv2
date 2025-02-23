import { Client, SlashCommandBuilder } from "discord.js";
import { storage } from "../../storage";

export default function registerCurrencyCommands(client: Client) {
  const listCurrencies = new SlashCommandBuilder()
    .setName("monedas")
    .setDescription("Lista todas las monedas disponibles");

  const checkBalance = new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra tu balance actual de monedas");

  const transferCurrency = new SlashCommandBuilder()
    .setName("transferir")
    .setDescription("Transfiere monedas a otro usuario")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario que recibirá las monedas")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Nombre de la moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad a transferir")
        .setRequired(true)
        .setMinValue(1));

  const work = new SlashCommandBuilder()
    .setName("trabajar")
    .setDescription("Trabaja para ganar monedas aleatorias");

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "monedas") {
      try {
        const currencies = await storage.getCurrencies(interaction.guildId!);
        if (currencies.length === 0) {
          await interaction.reply("No hay monedas configuradas en este servidor.");
          return;
        }

        const list = currencies.map(c => `${c.name} (${c.symbol})`).join("\n");
        await interaction.reply(`Monedas disponibles:\n${list}`);
      } catch (error) {
        await interaction.reply({
          content: "Hubo un error al listar las monedas",
          ephemeral: true
        });
      }
    }

    if (interaction.commandName === "balance") {
      try {
        let wallet = await storage.getUserWallet(interaction.guildId!, interaction.user.id);

        // Create wallet if it doesn't exist
        if (!wallet) {
          wallet = await storage.createUserWallet({
            guildId: interaction.guildId!,
            userId: interaction.user.id
          });
        }

        const currencies = await storage.getCurrencies(interaction.guildId!);
        if (currencies.length === 0) {
          await interaction.reply("No hay monedas configuradas en este servidor.");
          return;
        }

        const balanceLines = currencies.map(currency => {
          const amount = wallet!.wallet[currency.name] || 0;
          return `${currency.name}: ${amount} ${currency.symbol}`;
        });

        await interaction.reply({
          content: `Balance de <@${interaction.user.id}>:\n${balanceLines.join("\n")}`,
          ephemeral: true
        });
      } catch (error) {
        await interaction.reply({
          content: "Hubo un error al consultar tu balance",
          ephemeral: true
        });
      }
    }

    if (interaction.commandName === "transferir") {
      try {
        const targetUser = interaction.options.getUser("usuario", true);
        const currencyName = interaction.options.getString("moneda", true);
        const amount = interaction.options.getInteger("cantidad", true);

        // Get or create both wallets
        let fromWallet = await storage.getUserWallet(interaction.guildId!, interaction.user.id);
        let toWallet = await storage.getUserWallet(interaction.guildId!, targetUser.id);

        if (!fromWallet) {
          fromWallet = await storage.createUserWallet({
            guildId: interaction.guildId!,
            userId: interaction.user.id
          });
        }

        if (!toWallet) {
          toWallet = await storage.createUserWallet({
            guildId: interaction.guildId!,
            userId: targetUser.id
          });
        }

        // Verify currency exists
        const currencies = await storage.getCurrencies(interaction.guildId!);
        const currency = currencies.find(c => c.name === currencyName);
        if (!currency) {
          await interaction.reply({
            content: "Moneda no encontrada",
            ephemeral: true
          });
          return;
        }

        // Verify sender has enough funds
        const currentBalance = fromWallet.wallet[currencyName] || 0;
        if (currentBalance < amount) {
          await interaction.reply({
            content: `No tienes suficientes ${currency.symbol}`,
            ephemeral: true
          });
          return;
        }

        // Perform transfer
        const transaction = await storage.transferCurrency(
          interaction.guildId!,
          interaction.user.id,
          targetUser.id,
          currencyName,
          amount
        );

        // Send confirmation
        await interaction.reply(`Transferencia exitosa: ${amount} ${currency.symbol} enviados a <@${targetUser.id}>`);

        // Log transaction if channel is configured
        const settings = await storage.getGuildSettings(interaction.guildId!);
        if (settings?.transactionLogChannel) {
          const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
          if (channel?.isTextBased()) {
            await channel.send(
              `💰 Nueva transferencia:\n` +
              `De: <@${interaction.user.id}>\n` +
              `Para: <@${targetUser.id}>\n` +
              `Cantidad: ${amount} ${currency.symbol}\n` +
              `Fecha: ${transaction.timestamp.toLocaleString()}`
            );
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === "Insufficient funds") {
          await interaction.reply({
            content: "No tienes suficientes fondos para esta transferencia",
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: "Hubo un error al realizar la transferencia",
            ephemeral: true
          });
        }
      }
    }

    if (interaction.commandName === "trabajar") {
      try {
        const currencies = await storage.getCurrencies(interaction.guildId!);
        if (currencies.length === 0) {
          await interaction.reply("No hay monedas configuradas en este servidor.");
          return;
        }

        // Get or create user wallet
        let wallet = await storage.getUserWallet(interaction.guildId!, interaction.user.id);
        if (!wallet) {
          wallet = await storage.createUserWallet({
            guildId: interaction.guildId!,
            userId: interaction.user.id
          });
        }

        // Select random currency and amount
        const randomCurrency = currencies[Math.floor(Math.random() * currencies.length)];
        const earnedAmount = Math.floor(Math.random() * 41) + 10; // Random between 10 and 50

        // Update wallet
        const updatedWallet = { ...wallet.wallet };
        updatedWallet[randomCurrency.name] = (updatedWallet[randomCurrency.name] || 0) + earnedAmount;
        await storage.updateUserWallet(wallet.id, updatedWallet);

        await interaction.reply(
          `¡Has trabajado y ganado ${earnedAmount} ${randomCurrency.symbol}!\n` +
          `Tu nuevo balance de ${randomCurrency.name} es: ${updatedWallet[randomCurrency.name]} ${randomCurrency.symbol}`
        );

        // Log transaction if channel is configured
        const settings = await storage.getGuildSettings(interaction.guildId!);
        if (settings?.transactionLogChannel) {
          const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
          if (channel?.isTextBased()) {
            await channel.send(
              `💼 Recompensa por trabajo:\n` +
              `Usuario: <@${interaction.user.id}>\n` +
              `Ganancia: ${earnedAmount} ${randomCurrency.symbol}\n` +
              `Fecha: ${new Date().toLocaleString()}`
            );
          }
        }
      } catch (error) {
        await interaction.reply({
          content: "Hubo un error al procesar tu trabajo",
          ephemeral: true
        });
      }
    }
  });
}