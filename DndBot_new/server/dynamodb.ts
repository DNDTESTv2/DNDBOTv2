import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
  throw new Error("AWS credentials not found. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_REGION");
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Nombres de las tablas
export const TableNames = {
  CURRENCIES: "rpg_bot_currencies",
  USER_WALLETS: "rpg_bot_user_wallets",
  GUILD_SETTINGS: "rpg_bot_guild_settings",
  TRANSACTIONS: "rpg_bot_transactions",
  CHARACTERS: "rpg_bot_characters"
} as const;
