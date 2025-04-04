import { Client, SlashCommandBuilder, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, MessageFlags, CommandInteraction, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { storage } from "../../storage";

export default function registerCurrencyCommands(client: Client, commands: Collection<string, any>) {
  const trabajarCommand = new SlashCommandBuilder()
    .setName("trabajar")
    .setDescription("Trabaja para ganar monedas (disponible cada 3 días)");

  const robarCommand = new SlashCommandBuilder()
    .setName("robar")
    .setDescription("Intenta robar monedas a otro usuario (disponible cada 3 días)")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario al que intentarás robar")
        .setRequired(true));

  const listCurrencies = new SlashCommandBuilder()
    .setName("monedas")
    .setDescription("Lista todas las monedas disponibles");

  const checkBalance = new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra tu balance actual y el balance del banco central");

  const createCurrency = new SlashCommandBuilder()
    .setName("crear-moneda")
    .setDescription("Crea una nueva moneda para el servidor (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName("nombre")
        .setDescription("Nombre de la moneda")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("simbolo")
        .setDescription("Símbolo de la moneda")
        .setRequired(true));

  const pagarDeudaCommand = new SlashCommandBuilder()
    .setName("pagar-deuda")
    .setDescription("Pagar una deuda pendiente")
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Tipo de moneda de la deuda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad a pagar")
        .setRequired(true)
        .setMinValue(1));

  /*const prestamoCommand = new SlashCommandBuilder()
    .setName("pedir-prestamo")
    .setDescription("Solicitar un préstamo del banco")
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Tipo de moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad a solicitar")
        .setRequired(true)
        .setMinValue(1));
*/
  
  const addMoneyCommand = new SlashCommandBuilder()
    .setName("agregar-dinero")
    .setDescription("Agrega dinero a la billetera de un usuario (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario al que agregar dinero")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Tipo de moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad a agregar")
        .setRequired(true)
        .setMinValue(1));

  const transferirCommand = new SlashCommandBuilder()
    .setName("transferir")
    .setDescription("Transfiere monedas a otro usuario")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario al que transferir")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Tipo de moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad a transferir")
        .setRequired(true)
        .setMinValue(1));

  const cobrarCommand = new SlashCommandBuilder()
    .setName("cobrar")
    .setDescription("Cobra un monto a todos los usuarios (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Tipo de moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("monto")
        .setDescription("Monto a cobrar")
        .setRequired(true)
        .setMinValue(1));

  const cobrarComercianteCommand = new SlashCommandBuilder()
    .setName("cobrar-comerciante")
    .setDescription("Cobra un monto a todos los usuarios con comercios (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Tipo de moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("monto")
        .setDescription("Monto a cobrar")
        .setRequired(true)
        .setMinValue(1));


  // Registrar todos los comandos
  commands.set(trabajarCommand.name, trabajarCommand.toJSON());
  commands.set(robarCommand.name, robarCommand.toJSON());
  commands.set(listCurrencies.name, listCurrencies.toJSON());
  commands.set(checkBalance.name, checkBalance.toJSON());
  commands.set(createCurrency.name, createCurrency.toJSON());
  commands.set(pagarDeudaCommand.name, pagarDeudaCommand.toJSON());
  //commands.set(prestamoCommand.name, prestamoCommand.toJSON());
  commands.set(addMoneyCommand.name, addMoneyCommand.toJSON());
  commands.set(transferirCommand.name, transferirCommand.toJSON());
  commands.set(cobrarCommand.name, cobrarCommand.toJSON());
  commands.set(cobrarComercianteCommand.name, cobrarComercianteCommand.toJSON());

  console.log("Registrando comandos de moneda:", Array.from(commands.keys()));

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    try {
      // Verificar permisos de administrador para comandos restringidos
      if ((commandName === "cobrar" || commandName === "cobrar-comerciante") && 
          !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "No tienes permisos de administrador para usar este comando.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      switch (commandName) {
        case "pagar-deuda":
          try {
            const currencyName = interaction.options.getString("moneda", true);
            const amount = interaction.options.getInteger("cantidad", true);

            // Verificar que la moneda existe
            const currencies = await storage.getCurrencies(interaction.guildId!);
            const currency = currencies.find(c => c.name === currencyName);
            if (!currency) {
              await interaction.reply({
                content: "Moneda no encontrada",
                ephemeral: true
              });
              return;
            }

            // Obtener la billetera del usuario
            let userWallet = await storage.getUserWallet(interaction.guildId!, interaction.user.id);
            if (!userWallet) {
              await interaction.reply({
                content: "No tienes una billetera",
                ephemeral: true
              });
              return;
            }

            // Verificar si tiene deuda en esa moneda
            const debtKey = `debt_${currencyName}`;
            let currentDebt = userWallet.wallet[debtKey] || 0;
            const debtDate = userWallet.wallet[`debt_date_${currencyName}`];

            if (debtDate) {
              const oneAndHalfWeekInMs = 10.5 * 24 * 60 * 60 * 1000; // 1.5 semanas en milisegundos
              const debtTime = new Date(debtDate).getTime();
              const now = new Date().getTime();

              if (now - debtTime > oneAndHalfWeekInMs) {
                currentDebt = Math.floor(currentDebt * 1.5);
              }
            }
            if (currentDebt === 0) {
              await interaction.reply({
                content: `No tienes deudas pendientes en ${currency.symbol}`,
                ephemeral: true
              });
              return;
            }

            // Calcular el interés del 25%
            const interestAmount = Math.floor(amount * 0.25);
            const totalAmount = amount + interestAmount;

            // Verificar si tiene suficientes fondos
            const currentBalance = userWallet.wallet[currencyName] || 0;
            if (currentBalance < totalAmount) {
              await interaction.reply({
                content: `No tienes suficientes ${currency.symbol} para realizar el pago (${totalAmount} necesarios, tienes ${currentBalance})`,
                ephemeral: true
              });
              return;
            }

            // Verificar que no intente pagar más de lo que debe
            if (amount > currentDebt) {
              await interaction.reply({
                content: `Tu deuda actual es de ${currentDebt} ${currency.symbol}. No puedes pagar más de lo que debes.`,
                ephemeral: true
              });
              return;
            }

            // Actualizar la deuda y realizar la transferencia
            const updatedWallet = { ...userWallet.wallet };
            updatedWallet[debtKey] = currentDebt - amount; // Actualizar la deuda
            updatedWallet[currencyName] = (updatedWallet[currencyName] || 0) - totalAmount; // Descontar el pago con interés
            await storage.updateUserWallet(userWallet.id, updatedWallet);

            // Actualizar la billetera del bot
            const botWallet = await storage.getUserWallet(interaction.guildId!, client.user!.id);
            const updatedBotWallet = { ...botWallet!.wallet };
            updatedBotWallet[currencyName] = (updatedBotWallet[currencyName] || 0) + totalAmount;
            await storage.updateUserWallet(botWallet!.id, updatedBotWallet);

            await interaction.reply(
              `✅ Pago de deuda exitoso:\n` +
              `Pagado: ${amount} ${currency.symbol} (+ ${interestAmount} ${currency.symbol} de interés)\n` +
              `Deuda restante: ${updatedWallet[debtKey]} ${currency.symbol}`
            );

            // Registrar en el canal de log
            const settings = await storage.getGuildSettings(interaction.guildId!);
            if (settings?.transactionLogChannel) {
              const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
              if (channel?.isTextBased()) {
                await channel.send(
                  `💰 Pago de deuda:\n` +
                  `Usuario: <@${interaction.user.id}>\n` +
                  `Cantidad pagada: ${amount} ${currency.symbol} (+ ${interestAmount} ${currency.symbol} de interés)\n` +
                  `Deuda restante: ${updatedWallet[debtKey]} ${currency.symbol}\n` +
                  `Fecha: ${new Date().toLocaleString()}`
                );
              }
            }
          } catch (error) {
            await interaction.reply({
              content: "Error al procesar el pago de la deuda",
              ephemeral: true
            });
          }
          break;
        case "prestamo":
          try {
            // Verificar si el usuario tiene alguno de los roles requeridos
            const member = await interaction.guild?.members.fetch(interaction.user.id);
            const tieneRolRequerido = member?.roles.cache.some(role =>
              ["Rango C", "Rango B", "Rango A"].includes(role.name)
            );

            if (!tieneRolRequerido) {
              await interaction.reply({
                content: "No cumples con los requisitos para el Prestamo",
                ephemeral: true
              });
              return;
            }

            const moneda = interaction.options.getString("moneda", true);
            const cantidad = interaction.options.getInteger("cantidad", true);

            // Verificar que la moneda existe
            const currencies = await storage.getCurrencies(interaction.guildId!);
            const currency = currencies.find(c => c.name === moneda);
            if (!currency) {
              await interaction.reply({
                content: "Moneda no encontrada",
                ephemeral: true
              });
              return;
            }

            // Obtener o crear la billetera del usuario
            let userWallet = await storage.getUserWallet(interaction.guildId!, interaction.user.id);
            if (!userWallet) {
              userWallet = await storage.createUserWallet({
                guildId: interaction.guildId!,
                userId: interaction.user.id
              });
            }

            // Transferir el préstamo del bot al usuario
            const transaction = await storage.transferCurrency(
              interaction.guildId!,
              client.user!.id,
              interaction.user.id,
              moneda,
              cantidad
            );

            // Actualizar la wallet del usuario con el préstamo y la deuda
            const updatedWallet = { ...userWallet.wallet };
            updatedWallet[moneda] = (updatedWallet[moneda] || 0) + cantidad; // Agregar el préstamo
            updatedWallet[`debt_${moneda}`] = (updatedWallet[`debt_${moneda}`] || 0) + cantidad; // Registrar la deuda
            updatedWallet[`debt_date_${moneda}`] = new Date().toISOString(); // Registrar la fecha del préstamo
            await storage.updateUserWallet(userWallet.id, updatedWallet);

            await interaction.reply(`Préstamo aprobado: ${cantidad} ${currency.symbol}`);

            // Registrar en el canal de log
            const settings = await storage.getGuildSettings(interaction.guildId!);
            if (settings?.transactionLogChannel) {
              const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
              if (channel?.isTextBased()) {
                await channel.send(
                  `💸 Nuevo préstamo:\n` +
                  `Usuario: <@${interaction.user.id}>\n` +
                  `Cantidad: ${cantidad} ${currency.symbol}\n` +
                  `Deuda total: ${updatedWallet[`debt_${moneda}`]} ${currency.symbol}\n` +
                  `Fecha: ${new Date().toLocaleString()}`
                );
              }
            }
          } catch (error) {
            await interaction.reply({
              content: "Error al procesar el préstamo",
              ephemeral: true
            });
          }
          break;
        case "balance":
          try {
            const [userWallet, centralWallet] = await Promise.all([
              storage.getUserWallet(interaction.guildId!, interaction.user.id),
              storage.getUserWallet(interaction.guildId!, client.user!.id)
            ]);

            const userEmbed = new EmbedBuilder()
              .setTitle("💰 Tu Balance")
              .setDescription("Aquí está el balance de tus monedas:")
              .setColor("#FFD700");

            const debtEmbed = new EmbedBuilder()
              .setTitle("💸 Tus Deudas")
              .setDescription("Estado actual de tus préstamos:")
              .setColor("#FF0000");

            if (!userWallet) {
              userEmbed.setDescription("No tienes una billetera. Se creará una automáticamente cuando recibas monedas.");
            } else {
              for (const [currency, amount] of Object.entries(userWallet.wallet)) {
                if (!currency.includes('date') && !currency.startsWith('debt_')) {
                  userEmbed.addFields({ name: currency, value: `${amount} monedas`, inline: true });
                }
              }
            }

            const centralEmbed = new EmbedBuilder()
              .setTitle("🏦 Balance del Banco Central")
              .setDescription("Balance actual del banco central:")
              .setColor("#00FF00");

            if (!centralWallet) {
              centralEmbed.setDescription("El banco central aún no tiene fondos.");
            } else {
              for (const [currency, amount] of Object.entries(centralWallet.wallet)) {
                centralEmbed.addFields({ name: currency, value: `${amount} monedas`, inline: true });
              }
            }

            if (userWallet) {
              const debts = Object.entries(userWallet.wallet)
                .filter(([key]) => key.startsWith('debt_') && !key.startsWith('debt_date_'))
                .map(([key, amount]) => {
                  const currency = key.replace('debt_', '');
                  const debtDate = userWallet.wallet[`debt_date_${currency}`];

                  if (debtDate) {
                    const oneAndHalfWeekInMs = 10.5 * 24 * 60 * 60 * 1000; // 1.5 semanas en milisegundos
                    const debtTime = new Date(debtDate).getTime();
                    const now = new Date().getTime();

                    if (now - debtTime > oneAndHalfWeekInMs) {
                      amount = Math.floor(amount * 1.5);
                    }
                  }

                  return {
                    currency,
                    amount,
                    hasInterest: debtDate && (new Date().getTime() - new Date(debtDate).getTime() > 10.5 * 24 * 60 * 60 * 1000)
                  }
                });

              if (debts.length > 0) {
                for (const debt of debts) {
                  const debtDate = userWallet.wallet[`debt_date_${debt.currency}`];
                  let debtAmount = debt.amount;
                  let hasInterest = false;

                  if (debtDate) {
                    const oneAndHalfWeekInMs = 10.5 * 24 * 60 * 60 * 1000;
                    const debtTime = new Date(debtDate).getTime();
                    const now = new Date().getTime();

                    if (now - debtTime > oneAndHalfWeekInMs) {
                      debtAmount = Math.floor(debtAmount * 1.5);
                      hasInterest = true;
                    }
                  }

                  debtEmbed.addFields({
                    name: debt.currency,
                    value: `${debt.amount} monedas${debt.hasInterest ? ' (¡+50% por retraso!)' : ''}`,
                    inline: true
                  });
                }
              } else {
                debtEmbed.setDescription("No tienes deudas pendientes 🎉");
              }
            }

            await interaction.reply({
              embeds: [userEmbed, centralEmbed, debtEmbed],
              ephemeral: true
            });
          } catch (error) {
            console.error("Error al obtener balances:", error);
            await interaction.reply({
              content: "Hubo un error al obtener los balances.",
              ephemeral: true
            });
          }
          break;
        case "monedas":
          try {
            const currencies = await storage.getCurrencies(interaction.guildId!);
            if (currencies.length === 0) {
              await interaction.reply({
                content: "No hay monedas configuradas en este servidor.",
                ephemeral: true
              });
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
          break;
        case "transferir":
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
          break;
        case "trabajar":
          try {
            const currencies = await storage.getCurrencies(interaction.guildId!);
            if (currencies.length === 0) {
              await interaction.reply({
                content: "No hay monedas configuradas en este servidor.",
                ephemeral: true
              });
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

            // Check cooldown
            const now = new Date();
            if (wallet.lastWorked) {
              const timeSinceLastWork = now.getTime() - wallet.lastWorked.getTime();
              const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

              if (timeSinceLastWork < threeDaysInMs) {
                const remainingTime = threeDaysInMs - timeSinceLastWork;
                const remainingHours = Math.ceil(remainingTime / (60 * 60 * 1000));
                const remainingDays = Math.floor(remainingHours / 24);
                const hours = remainingHours % 24;

                await interaction.reply({
                  content: `Debes esperar ${remainingDays} días y ${hours} horas antes de poder trabajar nuevamente.`,
                  ephemeral: true
                });
                return;
              }
            }

            // Select random currency and amount
            const randomCurrency = currencies[Math.floor(Math.random() * currencies.length)];
            const earnedAmount = Math.floor(Math.random() * 91) + 10; // Random between 10 and 100

            // Update wallet with new amount and last worked time
            const tax = Math.floor(earnedAmount * 0.1); // 10% de impuesto
            const amountAfterTax = earnedAmount - tax;

            // Actualizar wallet del usuario con la cantidad después de impuestos
            const updatedWallet = { ...wallet.wallet };
            updatedWallet[randomCurrency.name] = (updatedWallet[randomCurrency.name] || 0) + earnedAmount;
            await storage.updateUserWallet(wallet.id, updatedWallet, now);

            // Transferir el impuesto a la wallet del bot
            if (interaction.user.id !== client.user!.id) {
              await storage.transferCurrency(
                interaction.guildId!,
                interaction.user.id,
                client.user!.id,
                randomCurrency.name,
                tax
              );
            }

            await interaction.reply(
              `¡Has trabajado y ganado ${earnedAmount} ${randomCurrency.symbol}!\n` +
              `Impuesto (10%): ${tax} ${randomCurrency.symbol}\n` +
              `Ganancia neta: ${amountAfterTax} ${randomCurrency.symbol}\n` +
              `Tu nuevo balance de ${randomCurrency.name} es: ${updatedWallet[randomCurrency.name]} ${randomCurrency.symbol}\n` +
              `Podrás volver a trabajar en 3 días.`
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
                  `Fecha: ${now.toLocaleString()}`
                );
              }
            }
          } catch (error) {
            await interaction.reply({
              content: "Hubo un error al procesar tu trabajo",
              ephemeral: true
            });
          }
          break;
        case "robar":
          try {
            const targetUser = interaction.options.getUser("usuario", true);

            // No puedes robarte a ti mismo
            if (targetUser.id === interaction.user.id) {
              await interaction.reply({
                content: "No puedes robarte a ti mismo 🤦‍♂️",
                ephemeral: true
              });
              return;
            }

            // Obtener o crear billeteras
            let fromWallet = await storage.getUserWallet(interaction.guildId!, targetUser.id);
            let toWallet = await storage.getUserWallet(interaction.guildId!, interaction.user.id);

            if (!fromWallet) {
              fromWallet = await storage.createUserWallet({
                guildId: interaction.guildId!,
                userId: targetUser.id
              });
            }

            if (!toWallet) {
              toWallet = await storage.createUserWallet({
                guildId: interaction.guildId!,
                userId: interaction.user.id
              });
            }

            // Verificar cooldown de robo
            const now = new Date();
            const lastStolenDate = toWallet.lastStolen ? new Date(toWallet.lastStolen) : null;
            if (lastStolenDate) {
              const timeSinceLastSteal = now.getTime() - lastStolenDate.getTime();
              const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

              if (timeSinceLastSteal < threeDaysInMs) {
                const remainingTime = threeDaysInMs - timeSinceLastSteal;
                const remainingHours = Math.ceil(remainingTime / (60 * 60 * 1000));
                const remainingDays = Math.floor(remainingHours / 24);
                const hours = remainingHours % 24;

                await interaction.reply({
                  content: `Debes esperar ${remainingDays} días y ${hours} horas antes de poder robar nuevamente.`,
                  ephemeral: true
                });
                return;
              }
            }

            // Obtener monedas disponibles
            const currencies = await storage.getCurrencies(interaction.guildId!);
            if (currencies.length === 0) {
              await interaction.reply({
                content: "No hay monedas configuradas en este servidor.",
                ephemeral: true
              });
              return;
            }

            // Verificar si la víctima tiene monedas
            const victimHasCoins = Object.values(fromWallet.wallet).some(amount => amount > 0);
            if (!victimHasCoins) {
              await interaction.reply({
                content: `${targetUser.username} no tiene monedas para robar 😢`,
                ephemeral: true
              });
              return;
            }

            // Seleccionar una moneda aleatoria que la víctima tenga
            const availableCurrencies = currencies.filter(c => (fromWallet!.wallet[c.name] || 0) > 0);
            const randomCurrency = availableCurrencies[Math.floor(Math.random() * availableCurrencies.length)];

            // Determinar cantidad a robar (entre 1 y 50% del balance de la víctima)
            const victimBalance = fromWallet.wallet[randomCurrency.name] || 0;
            const maxSteal = Math.min(10, Math.floor(victimBalance * 0.5)); // Máximo 10 o 50% del balance, lo que sea menor
            const amountStolen = Math.floor(Math.random() * maxSteal) + 1;

            // Actualizar billeteras
            const fromUpdated = { ...fromWallet.wallet };
            const toUpdated = { ...toWallet.wallet };

            fromUpdated[randomCurrency.name] = (fromUpdated[randomCurrency.name] || 0) - amountStolen;
            toUpdated[randomCurrency.name] = (toUpdated[randomCurrency.name] || 0) + amountStolen;

            await storage.updateUserWallet(fromWallet.id, fromUpdated);
            // Actualizar billetera del ladrón con el nuevo tiempo de robo
            await storage.updateUserWallet(toWallet.id, toUpdated, undefined, now);

            // Crear registro de transacción
            await storage.createTransaction({
              guildId: interaction.guildId!,
              fromUserId: targetUser.id,
              toUserId: interaction.user.id,
              currencyName: randomCurrency.name,
              amount: amountStolen
            });

            // Enviar mensaje de éxito
            await interaction.reply(
              `🦹 ¡Robo exitoso!\n` +
              `Has robado ${amountStolen} ${randomCurrency.symbol} de ${targetUser.username}\n` +
              `Podrás volver a robar en 3 días.`
            );

            // Registrar en canal de log si está configurado
            const settings = await storage.getGuildSettings(interaction.guildId!);
            if (settings?.transactionLogChannel) {
              const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
              if (channel?.isTextBased()) {
                await channel.send(
                  `🦹 Robo detectado:\n` +
                  `Ladrón: <@${interaction.user.id}>\n` +
                  `Víctima: <@${targetUser.id}>\n` +
                  `Cantidad: ${amountStolen} ${randomCurrency.symbol}\n` +
                  `Fecha: ${new Date().toLocaleString()}`
                );
              }
            }
          } catch (error) {
            console.error("Error en comando robar:", error);
            await interaction.reply({
              content: "Hubo un error al intentar robar",
              ephemeral: true
            });
          }
          break;
      }
    } catch (error) {
      console.error("Error al procesar la interacción:", error);
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true
      });
    }
  });
}