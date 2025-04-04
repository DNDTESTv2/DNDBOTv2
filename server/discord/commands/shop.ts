import { Client, Collection, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { RESTPostAPIChatInputApplicationCommandsJSONBody, MessageFlags } from "discord.js";
import { storage } from "../../storage";

export default function configureShopCommands(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  const viewShopsCommand = new SlashCommandBuilder()
    .setName("ver-comercios")
    .setDescription("Muestra tus comercios");

const createShopCommand = new SlashCommandBuilder()
    .setName("crear-comercio")
    .setDescription("Crea un nuevo comercio")
    .addStringOption(option =>
      option.setName("nombre")
        .setDescription("Nombre del comercio")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("tipo")
        .setDescription("Tipo de comercio")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("tamaño")
        .setDescription("Tamaño del comercio")
        .setRequired(true)
        .addChoices(
          { name: 'Chico', value: 'chico' },
          { name: 'Mediano', value: 'mediano' },
          { name: 'Grande', value: 'grande' }
        ))
    .addStringOption(option =>
      option.setName("imagen")
        .setDescription("URL de la imagen del comercio")
        .setRequired(true));

  commands.set(createShopCommand.name, createShopCommand.toJSON());
  commands.set(viewShopsCommand.name, viewShopsCommand.toJSON());

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!["crear-comercio", "ver-comercios"].includes(interaction.commandName)) return;

  if (interaction.commandName === "ver-comercios") {
    try {
      const shops = await storage.getShopsByUser(interaction.guildId!, interaction.user.id);
      
      if (shops.length === 0) {
        await interaction.reply({
          content: "No tienes ningún comercio todavía.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embeds = shops.map(shop => {
        return new EmbedBuilder()
          .setTitle(`🏪 ${shop.name}`)
          .setDescription(`Tipo: ${shop.type}`)
          .addFields(
            { name: "Tamaño", value: shop.size.charAt(0).toUpperCase() + shop.size.slice(1), inline: true },
            { name: "Ingresos (Semanal)", value: `${shop.weeklyIncome * 7}`, inline: true }
          )
          .setImage(shop.imageUrl || '')
          .setColor("#00FF00")
          .setTimestamp(new Date(shop.createdAt));
      });

      await interaction.reply({
        content: `**Tus comercios** (${shops.length}/3):`,
        embeds: embeds
      });
    } catch (error) {
      console.error("Error al obtener comercios:", error);
      await interaction.reply({
        content: "Hubo un error al obtener tus comercios",
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  }

  if (interaction.commandName === "crear-comercio") {

    try {
      const wallet = await storage.getUserWallet(interaction.guildId!, interaction.user.id);
      if (!wallet) {
        await interaction.reply({
          content: "No tienes una billetera. Usa /crear-billetera primero.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Verificar número de comercios existentes
      const existingShops = await storage.getShopsByUser(interaction.guildId!, interaction.user.id);
      if (existingShops.length >= 3) {
        await interaction.reply({
          content: "Ya tienes el máximo de 3 comercios permitidos.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const costs = {
        'chico': 2000,
        'mediano': 4000,
        'grande': 6000
      };

      const tamaño = interaction.options.getString("tamaño", true);
      const cost = costs[tamaño as keyof typeof costs];
      const currencies = await storage.getCurrencies(interaction.guildId!);
      if (!currencies.length) {
        await interaction.reply({
          content: "No hay monedas configuradas en el servidor.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const currency = currencies[0];
      const balance = wallet.wallet[currency.name] || 0;
      if (balance < cost) {
        await interaction.reply({
          content: `No tienes suficiente dinero. Necesitas ${cost} ${currency.name}`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const nombre = interaction.options.getString("nombre", true);
      const tipo = interaction.options.getString("tipo", true);
      const imagen = interaction.options.getString("imagen", true);

      // Deduct cost from wallet
      const updatedWallet = { ...wallet.wallet };
      updatedWallet[currency.name] = balance - cost;
      await storage.updateUserWallet(wallet.id, updatedWallet);

      // Registrar en canal de log si está configurado
      const settings = await storage.getGuildSettings(interaction.guildId!);
      if (settings?.transactionLogChannel) {
        const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
        if (channel?.isTextBased()) {
          await channel.send(
            `🏪 Nuevo comercio creado:\n` +
            `Usuario: <@${interaction.user.id}>\n` +
            `Nombre: ${nombre}\n` +
            `Costo: ${cost} ${currency.name}\n` +
            `Fecha: ${new Date().toLocaleString()}`
          );
        }
      }

      const shop = await storage.createShop({
        guildId: interaction.guildId!,
        userId: interaction.user.id,
        name: nombre,
        type: tipo,
        size: tamaño,
        imageUrl: imagen
      });

      // Dar pago inicial
      const baseEarnings = {
        'chico': 250,
        'mediano': 500,
        'grande': 750
      };
      const initialEarnings = baseEarnings[tamaño];
      
      // Actualizar wallet con pago inicial
      updatedWallet[currency.name] = (updatedWallet[currency.name] || 0) + initialEarnings;
      await storage.updateUserWallet(wallet.id, updatedWallet);

      // Registrar pago inicial en canal de log
      if (settings?.transactionLogChannel) {
        const channel = await interaction.guild?.channels.fetch(settings.transactionLogChannel);
        if (channel?.isTextBased()) {
          await channel.send(
            `💰 Pago inicial de comercio:\n` +
            `Comercio: ${nombre}\n` +
            `Dueño: <@${interaction.user.id}>\n` +
            `Ganancia inicial: ${initialEarnings} ${currency.symbol}\n` +
            `Fecha: ${new Date().toLocaleString()}`
          );
        }
      }
      
      console.log("Created shop:", shop);

      const embed = new EmbedBuilder()
        .setTitle(`🏪 Nuevo Comercio: ${nombre}`)
        .setDescription(`¡${interaction.user} ha creado un nuevo comercio!`)
        .addFields(
          { name: "Tipo", value: tipo, inline: true },
          { name: "Tamaño", value: tamaño.charAt(0).toUpperCase() + tamaño.slice(1), inline: true }
        )
        .setImage(imagen)
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error al crear comercio:", error);
      await interaction.reply({
        content: "Hubo un error al crear el comercio",
        flags: MessageFlags.Ephemeral
      });
    }
  }
});
}