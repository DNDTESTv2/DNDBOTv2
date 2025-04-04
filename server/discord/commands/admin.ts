import { SlashCommandBuilder } from "discord.js";
import { docClient, TableNames } from "../../dynamodb";
import { DeleteTableCommand, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import setupTables from "../../setup-dynamodb";
import { Client, PermissionFlagsBits, ChannelType, TextChannel, ThreadChannel, PermissionsString, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, MessageFlags } from "discord.js";
import { storage } from "../../storage";

export function registerAdminCommands(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  const createCurrency = new SlashCommandBuilder()
    .setName("crear-moneda")
    .setDescription("Crea una nueva moneda para el servidor (Admin)")
    .addStringOption(option =>
      option.setName("nombre")
        .setDescription("Nombre de la moneda")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("simbolo")
        .setDescription("Símbolo de la moneda")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const deleteCurrency = new SlashCommandBuilder()
    .setName("eliminar-moneda")
    .setDescription("Elimina una moneda existente del servidor (Admin)")
    .addStringOption(option =>
      option.setName("nombre")
        .setDescription("Nombre de la moneda a eliminar")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const setLogChannel = new SlashCommandBuilder()
    .setName("canal-registro")
    .setDescription("Establece el canal para registrar transacciones (Admin)")
    .addChannelOption(option =>
      option.setName("canal")
        .setDescription("Canal donde se registrarán las transacciones")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.PublicThread,
          ChannelType.PrivateThread,
          ChannelType.AnnouncementThread
        )
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

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
    .setDescription("Cobra un monto a todos los usuarios con comercios")
    .addStringOption(option =>
      option.setName("moneda")
        .setDescription("Tipo de moneda")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("monto")
        .setDescription("Monto a cobrar")
        .setRequired(true)
        .setMinValue(1));

  commands.set(createCurrency.name, createCurrency.toJSON());
  commands.set(deleteCurrency.name, deleteCurrency.toJSON());
  commands.set(setLogChannel.name, setLogChannel.toJSON());
  commands.set(cobrarCommand.name, cobrarCommand.toJSON());
  commands.set(cobrarComercianteCommand.name, cobrarComercianteCommand.toJSON());

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "canal-registro") {
      try {
        const channel = interaction.options.getChannel("canal", true);

        if (channel instanceof TextChannel || channel instanceof ThreadChannel) {
          const botMember = interaction.guild?.members.cache.get(client.user!.id);
          const requiredPermissions: PermissionsString[] = [
            'ViewChannel',
            'SendMessages',
            'ReadMessageHistory'
          ];

          const missingPermissions = requiredPermissions.filter(perm =>
            !channel.permissionsFor(botMember!)?.has(perm)
          );

          if (missingPermissions.length > 0) {
            const permissionsList = missingPermissions.map(perm =>
              `- ${perm}`
            ).join('\n');

            await interaction.reply({
              content: `No tengo los permisos necesarios en el canal ${channel.name}. 
              Permisos faltantes:
              ${permissionsList}

              Por favor, asegúrate de que tengo los siguientes permisos en el canal:
              - Ver Canal
              - Enviar Mensajes
              - Leer el Historial de Mensajes`,
              flags: MessageFlags.Ephemeral
            });
            return;
          }
        }

        if (![
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.PublicThread,
          ChannelType.PrivateThread,
          ChannelType.AnnouncementThread
        ].includes(channel.type)) {
          await interaction.reply({
            content: "Por favor selecciona un canal de texto, anuncios o hilo",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await storage.setTransactionLogChannel(interaction.guildId!, channel.id);
        await interaction.reply(`Canal de registro establecido a #${channel.name}`);

        if (channel instanceof TextChannel || channel instanceof ThreadChannel) {
          await channel.send(`✅ Canal configurado correctamente para registro de transacciones.

Importante: Para que el bot funcione correctamente, necesito los siguientes permisos en este canal:
- Ver Canal
- Enviar Mensajes
- Leer el Historial de Mensajes

Si en algún momento dejo de funcionar, por favor verifica estos permisos.`);
        }
      } catch (error) {
        console.error("Error al configurar canal de registro:", error);
        await interaction.reply({
          content: `Hubo un error al configurar el canal de registro. 
          Por favor verifica que:
          1. El bot tiene los permisos necesarios en el servidor
          2. El canal seleccionado es accesible por el bot
          3. El bot tiene los permisos necesarios en el canal`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (interaction.commandName === "crear-moneda") {
      try {
        const name = interaction.options.getString("nombre", true);
        const symbol = interaction.options.getString("simbolo", true);

        await storage.createCurrency({
          guildId: interaction.guildId!,
          name,
          symbol
        });

        await interaction.reply(`¡Moneda "${name}" (${symbol}) creada con éxito!`);
      } catch (error) {
        await interaction.reply({
          content: "Hubo un error al crear la moneda",
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (interaction.commandName === "eliminar-moneda") {
      try {
        const name = interaction.options.getString("nombre", true);
        const deleted = await storage.deleteCurrency(interaction.guildId!, name);

        if (deleted) {
          await interaction.reply(`Moneda "${name}" eliminada con éxito.`);
        } else {
          await interaction.reply({
            content: `No se encontró una moneda llamada "${name}"`,
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (error) {
        await interaction.reply({
          content: "Hubo un error al eliminar la moneda",
          flags: MessageFlags.Ephemeral
        });
      }
    }
    if (interaction.commandName === "cobrar") {
      try {
        const moneda = interaction.options.getString("moneda", true);
        const cantidad = interaction.options.getInteger("monto", true);


        const wallets = await storage.getAllWallets(interaction.guildId!);
        let cobrados = 0;
        let errorCount = 0;

        await interaction.reply(`Iniciando cobro de impuestos...`);

        for (const wallet of wallets) {
          try {
            // Saltar si es la wallet del bot o si no tiene la moneda
            if (wallet.userId === interaction.client.user?.id) continue;

            const balance = wallet.wallet[moneda] || 0;
            if (balance >= cantidad) {
              const updatedWallet = { ...wallet.wallet };
              updatedWallet[moneda] = balance - cantidad;
              await storage.updateUserWallet(wallet.id, updatedWallet);
              cobrados++;
            }
          } catch (error) {
            console.error("Error al procesar wallet:", error);
          }
        }

        // Actualizar la wallet del bot con los impuestos recaudados
        const botWallet = await storage.getUserWallet(interaction.guildId!, interaction.client.user?.id!);
        if (botWallet) {
          const updatedBotWallet = { ...botWallet.wallet };
          updatedBotWallet[moneda] = (updatedBotWallet[moneda] || 0) + (cobrados * cantidad);
          await storage.updateUserWallet(botWallet.id, updatedBotWallet);
        }


        const reply = `Cobro completado:\n` +
          `✅ ${cobrados} usuarios pagaron impuestos\n` +
          `❌ ${errorCount} errores durante el cobro`;
        await interaction.editReply(reply);

        // Registrar en el canal de log si está configurado
        const settings = await storage.getGuildSettings(interaction.guildId!);
        if (settings?.transactionLogChannel) {
          const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
          if (channel?.isTextBased()) {
            await channel.send(
              `💰 Cobro de impuestos:\n` +
              `Administrador: <@${interaction.user.id}>\n` +
              `Total recaudado: ${cobrados * cantidad} ${moneda}\n` + 
              `Fecha: ${new Date().toLocaleString()}`
            );
          }
        }
      } catch (error) {
        console.error("Error en comando cobrar:", error);
        await interaction.editReply({
          content: "Ocurrió un error al procesar el cobro"
        });
      }
    }
    if (interaction.commandName === "cobrar-comerciante") {
      if (!interaction.isRepliable()) {
        return;
      }

      const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) {
        await interaction.reply({
          content: "No tienes permiso para usar este comando",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const moneda = interaction.options.getString("moneda", true);
      const monto = interaction.options.getInteger("monto", true);

      try {
        // Obtener todos los comercios y sus dueños únicos
        const shops = await storage.getShopsByGuild(interaction.guildId!);
        const uniqueUserIds = [...new Set(shops.map(shop => shop.userId))];

        let totalCobrado = 0;
        let usuariosCobrados = 0;

        for (const userId of uniqueUserIds) {
          const wallet = await storage.getUserWallet(interaction.guildId!, userId);
          if (!wallet) continue;

          const balance = wallet.wallet[moneda] || 0;
          if (balance >= monto) {
            const updatedWallet = { ...wallet.wallet };
            updatedWallet[moneda] = balance - monto;
            await storage.updateUserWallet(wallet.id, updatedWallet);
            totalCobrado += monto;
            usuariosCobrados++;
          }
        }

        // Registrar en canal de log si está configurado
        const settings = await storage.getGuildSettings(interaction.guildId!);
        if (settings?.transactionLogChannel) {
          const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
          if (channel?.isTextBased()) {
            await channel.send(
              `💰 Cobro a comerciantes realizado:\n` +
              `Admin: <@${interaction.user.id}>\n` +
              `Monto por usuario: ${monto} ${moneda}\n` +
              `Total cobrado: ${totalCobrado} ${moneda}\n` +
              `Usuarios cobrados: ${usuariosCobrados}\n` +
              `Fecha: ${new Date().toLocaleString()}`
            );
          }
        }

        await interaction.reply(
          `✅ Cobro realizado:\n` +
          `• Monto por usuario: ${monto} ${moneda}\n` +
          `• Total cobrado: ${totalCobrado} ${moneda}\n` +
          `• Usuarios cobrados: ${usuariosCobrados}`
        );
      } catch (error) {
        console.error("Error al cobrar a comerciantes:", error);
        await interaction.reply({
          content: "Hubo un error al realizar el cobro",
          ephemeral: true
        });
      }
      return;
    }

    // Registrar comandos
    return commands;
  });
}