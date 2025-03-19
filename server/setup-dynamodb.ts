import { CreateTableCommand, DeleteTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
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
      { AttributeName: "guildId", KeyType: "HASH" },
      { AttributeName: "characterId", KeyType: "RANGE" }
    ],
    AttributeDefinitions: [
      { AttributeName: "guildId", AttributeType: "S" },
      { AttributeName: "characterId", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
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

  console.log("✅ Configuración de DynamoDB completada");
}

export default setupTables;
