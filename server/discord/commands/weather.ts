
import { Client, SlashCommandBuilder, Collection, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

// Lista de climas por categoría
const weatherTypes = {
  soleados: [
    "Cielo despejado y brisa suave.",
    "Día soleado con algunas nubes dispersas.",
    "Amanecer fresco, pero el sol calienta rápidamente.",
    "Calor moderado, con el viento refrescando el ambiente.",
    "Un día seco con el cielo azul intenso.",
    "Sol radiante, pero con una ligera neblina matinal.",
    "Temperatura templada con vientos ligeros.",
    "Cielo completamente despejado; ni una nube a la vista.",
    "Día cálido con un aire seco y envolvente.",
    "Ambiente soleado con nubes algodonosas en el horizonte."
  ],
  nubosos: [
    "Cielo cubierto con una luz grisácea difusa.",
    "Nubes densas, pero sin señales de lluvia.",
    "Un día nublado y algo pesado, sin viento.",
    "Amanecer oscuro con el sol luchando por asomarse.",
    "Día gris con brisa fresca.",
    "Cielo encapotado con ráfagas de viento intermitentes.",
    "Sensación de humedad en el aire, aunque sin lluvia.",
    "Niebla baja cubriendo el suelo por la mañana.",
    "Un cielo plomizo que da una sensación de pesadez.",
    "Atardecer teñido de naranja tras un día mayormente nublado."
  ],
  lluviosos: [
    "Llovizna ligera durante gran parte del día.",
    "Chubascos intermitentes con momentos de calma.",
    "Lluvia constante que humedece todo el paisaje.",
    "Nubes oscuras en el horizonte, anunciando tormenta.",
    "Trueno distante, pero sin lluvia por ahora.",
    "Lluvia suave acompañada de viento fresco.",
    "Tormenta eléctrica en la lejanía, iluminando el cielo.",
    "Un chaparrón inesperado que dura apenas unos minutos.",
    "Bruma húmeda después de una madrugada lluviosa.",
    "Día lluvioso con pequeños charcos por todas partes."
  ],
  frios: [
    "Mañana gélida con escarcha cubriendo el suelo.",
    "Nieve ligera que cae sin acumularse demasiado.",
    "Nubes gruesas y aire helado, pero sin nieve.",
    "Viento cortante que hace difícil mantenerse caliente.",
    "Día frío, pero con sol brillante sobre la nieve.",
    "Un frente de aire frío que desciende repentinamente.",
    "Copos de nieve esporádicos flotando en el aire.",
    "Amanecer helado con cristales de hielo en las hojas.",
    "Una ventisca en la noche dejó el terreno cubierto de blanco.",
    "Cielo despejado, pero el frío es intenso."
  ],
  ventosos: [
    "Vientos fuertes que levantan polvo y hojas secas.",
    "Brisa errática, a veces suave y otras con ráfagas intensas.",
    "Un aire cálido que se vuelve más frío al anochecer.",
    "Cambio repentino en la temperatura con ráfagas de viento.",
    "Sensación de inestabilidad en el clima; podría cambiar en cualquier momento.",
    "Niebla densa que se disipa con el viento.",
    "Ráfagas de viento ululan entre los árboles, sin lluvia.",
    "Brisa marina refrescante con olor a salitre.",
    "Un día con vientos persistentes que empujan las nubes.",
    "Tormenta de arena leve en regiones áridas, reduciendo la visibilidad."
  ]
};

let currentWeather = '';
let lastUpdate = new Date();

// Actualizar el clima cada 24 horas
setInterval(() => {
  const types = Object.keys(weatherTypes);
  const randomType = types[Math.floor(Math.random() * types.length)];
  const typeWeathers = weatherTypes[randomType as keyof typeof weatherTypes];
  currentWeather = typeWeathers[Math.floor(Math.random() * typeWeathers.length)];
  lastUpdate = new Date();
}, 24 * 60 * 60 * 1000);

// Generar clima inicial
const types = Object.keys(weatherTypes);
const randomType = types[Math.floor(Math.random() * types.length)];
const typeWeathers = weatherTypes[randomType as keyof typeof weatherTypes];
currentWeather = typeWeathers[Math.floor(Math.random() * typeWeathers.length)];

export default function registerWeatherCommands(
  client: Client,
  commands: Collection<string, RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  const weatherCommand = new SlashCommandBuilder()
    .setName("clima")
    .setDescription("Muestra el clima actual");

  commands.set(weatherCommand.name, weatherCommand.toJSON());

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "clima") return;

    const timeSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (60 * 60 * 1000));
    const nextUpdate = 24 - timeSinceUpdate;

    await interaction.reply(
      `🌤️ **Clima Actual:**\n${currentWeather}\n\n` +
      `*(El clima se actualizará en ${nextUpdate} horas)*`
    );
  });
}
