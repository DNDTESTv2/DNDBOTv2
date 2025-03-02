import { SlashCommandBuilder } from "discord.js";
import { docClient, TableNames } from "../../dynamodb";
import { DeleteTableCommand, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import setupTables from "../../setup-dynamodb";

export const hardReset = new SlashCommandBuilder()
  .setName("hard-reset")
  .setDescription("Resetea toda la base de datos (¡Cuidado!)");

export async function handleHardReset(interaction: any) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "No tienes permisos para usar este comando",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Eliminar todas las tablas existentes
    for (const tableName of Object.values(TableNames)) {
      try {
        await docClient.send(new DeleteTableCommand({ TableName: tableName }));
        await interaction.followUp({
          content: `Tabla ${tableName} eliminada`,
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error(`Error eliminando tabla ${tableName}:`, error);
      }
    }

    // Esperar un momento para asegurar que las tablas se eliminaron
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Recrear todas las tablas
    await setupTables();

    await interaction.followUp({
      content: "¡Reset completado! Todas las tablas han sido recreadas.",
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error("Error en hard-reset:", error);
    await interaction.followUp({
      content: "Hubo un error al resetear la base de datos",
      flags: MessageFlags.Ephemeral
    });
  }
}

import { Client, PermissionFlagsBits, SlashCommandBuilder, ChannelType, TextChannel, ThreadChannel, PermissionsString, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody, MessageFlags } from "discord.js";
import { storage } from "../../storage";

export function registerAdminCommands(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  const createCurrency = new SlashCommandBuilder()
    .setName("crear-moneda")
    .setDescription("Crea una nueva moneda para el servidor")
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
    .setDescription("Elimina una moneda existente del servidor")
    .addStringOption(option =>
      option.setName("nombre")
        .setDescription("Nombre de la moneda a eliminar")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const setLogChannel = new SlashCommandBuilder()
    .setName("canal-registro")
    .setDescription("Establece el canal para registrar transacciones")
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

  // Agregar comandos a la colección
  commands.set(createCurrency.name, createCurrency.toJSON());
  commands.set(deleteCurrency.name, deleteCurrency.toJSON());
  commands.set(setLogChannel.name, setLogChannel.toJSON());

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
  });
}