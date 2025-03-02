import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { docClient, TableNames } from "./dynamodb";

const tables = [
  {
    TableName: TableNames.CURRENCIES,
    KeySchema: [
      { AttributeName: "guildId", KeyType: "HASH" as const },
      { AttributeName: "name", KeyType: "RANGE" as const }
    ],
    AttributeDefinitions: [
      { AttributeName: "guildId", AttributeType: "S" as const },
      { AttributeName: "name", AttributeType: "S" as const },
      { AttributeName: "id", AttributeType: "N" as const }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "IdIndex",
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" as const }
        ],
        Projection: {
          ProjectionType: "ALL" as const
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  {
    TableName: TableNames.USER_WALLETS,
    KeySchema: [
      { AttributeName: "guildId", KeyType: "HASH" as const },
      { AttributeName: "userId", KeyType: "RANGE" as const }
    ],
    AttributeDefinitions: [
      { AttributeName: "guildId", AttributeType: "S" as const },
      { AttributeName: "userId", AttributeType: "S" as const },
      { AttributeName: "id", AttributeType: "N" as const }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "IdIndex",
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" as const }
        ],
        Projection: {
          ProjectionType: "ALL" as const
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  {
    TableName: TableNames.GUILD_SETTINGS,
    KeySchema: [
      { AttributeName: "guildId", KeyType: "HASH" as const }
    ],
    AttributeDefinitions: [
      { AttributeName: "guildId", AttributeType: "S" as const }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  {
    TableName: TableNames.TRANSACTIONS,
    KeySchema: [
      { AttributeName: "guildId", KeyType: "HASH" as const },
      { AttributeName: "timestamp", KeyType: "RANGE" as const }
    ],
    AttributeDefinitions: [
      { AttributeName: "guildId", AttributeType: "S" as const },
      { AttributeName: "timestamp", AttributeType: "S" as const },
      { AttributeName: "id", AttributeType: "N" as const }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "IdIndex",
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" as const }
        ],
        Projection: {
          ProjectionType: "ALL" as const
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  {
    TableName: TableNames.CHARACTERS,
    KeySchema: [
      { AttributeName: "guildId", KeyType: "HASH" as const },
      { AttributeName: "userId", KeyType: "RANGE" as const }
    ],
    AttributeDefinitions: [
      { AttributeName: "guildId", AttributeType: "S" as const },
      { AttributeName: "userId", AttributeType: "S" as const },
      { AttributeName: "id", AttributeType: "N" as const }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "IdIndex",
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" as const }
        ],
        Projection: {
          ProjectionType: "ALL" as const
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  }
];

async function setupTables() {
  console.log("🔄 Iniciando configuración de tablas DynamoDB...");

  for (const tableDefinition of tables) {
    try {
      console.log(`⏳ Creando tabla ${tableDefinition.TableName}...`);
      await docClient.send(new CreateTableCommand(tableDefinition));
      console.log(`✅ Tabla ${tableDefinition.TableName} creada exitosamente`);
    } catch (error: any) {
      if (error.name === 'ResourceInUseException') {
        console.log(`ℹ️ La tabla ${tableDefinition.TableName} ya existe`);
      } else {
        console.error(`❌ Error creando tabla ${tableDefinition.TableName}:`, error);
        throw error; // Re-throw para que el error sea capturado en index.ts
      }
    }
  }

  console.log("✅ Configuración de DynamoDB completada");
}

export default setupTables;