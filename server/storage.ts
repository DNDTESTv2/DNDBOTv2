import { docClient, TableNames } from "./dynamodb";
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { currencies, userWallets, guildSettings, transactions, characters, shops,
  type Currency, type UserWallet, type GuildSettings, type Transaction, type Character, type Shop,
  type InsertCurrency, type InsertUserWallet, type InsertGuildSettings, type InsertTransaction, type InsertCharacter, type InsertShop
} from "@shared/schema";

export interface IStorage {
  // Reputation operations
  getReputation(guildId: string, userId: string): Promise<number>;
  addReputation(guildId: string, userId: string, points: number): Promise<number>;
  removeReputation(guildId: string, userId: string, amount: number): Promise<number>;

  // Currency operations
  getCurrencies(guildId: string): Promise<Currency[]>;
  createCurrency(currency: InsertCurrency): Promise<Currency>;
  deleteCurrency(guildId: string, name: string): Promise<boolean>;

  // User wallet operations
  getUserWallet(guildId: string, userId: string): Promise<UserWallet | undefined>;
  createUserWallet(wallet: InsertUserWallet): Promise<UserWallet>;
  updateUserWallet(
    id: number,
    wallet: Record<string, number>,
    lastWorked?: Date,
    lastStolen?: Date
  ): Promise<UserWallet>;

  // Guild settings operations
  getGuildSettings(guildId: string): Promise<GuildSettings | undefined>;
  setTransactionLogChannel(guildId: string, channelId: string): Promise<GuildSettings>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(guildId: string): Promise<Transaction[]>;
  transferCurrency(
    guildId: string,
    fromUserId: string,
    toUserId: string,
    currencyName: string,
    amount: number
  ): Promise<Transaction>;

  // Character operations
  createCharacter(character: InsertCharacter): Promise<Character>;
  getCharacter(guildId: string, userId: string): Promise<Character | undefined>;
  getCharacters(guildId: string): Promise<Character[]>;
  updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character>;
  deleteCharacter(id: number): Promise<boolean>;

  // Shop operations
  createShop(shop: InsertShop): Promise<Shop>;
  getShopsByGuild(guildId: string): Promise<Shop[]>;
  getShopsByUser(guildId: string, userId: string): Promise<Shop[]>;
  updateShopPayout(shopId: number, lastPayout: Date): Promise<void>;

  // Additional wallet operations
  getAllWallets(guildId: string): Promise<UserWallet[]>;
}

export class DynamoDBStorage implements IStorage {
  async getReputation(guildId: string, userId: string): Promise<number> {
    const response = await docClient.send(
      new GetCommand({
        TableName: TableNames.REPUTATION,
        Key: {
          guildId,
          userId
        }
      })
    );
    return response.Item?.points || 0;
  }

  async addReputation(guildId: string, userId: string, points: number): Promise<number> {
    const currentPoints = await this.getReputation(guildId, userId);
    const newPoints = currentPoints + points;

    await docClient.send(
      new PutCommand({
        TableName: TableNames.REPUTATION,
        Item: {
          guildId,
          userId,
          points: newPoints
        }
      })
    );

    return newPoints;
  }

  async removeReputation(guildId: string, userId: string, amount: number): Promise<number> {
    const currentPoints = await this.getReputation(guildId, userId);
    const newPoints = Math.max(0, currentPoints - amount);

    await docClient.send(new UpdateCommand({
      TableName: TableNames.REPUTATION,
      Key: { guildId, userId },
      UpdateExpression: "set points = :p",
      ExpressionAttributeValues: { ":p": newPoints }
    }));

    return newPoints;
  }

  async getAllReputationRanking(guildId: string): Promise<{userId: string, points: number}[]> {
    const response = await docClient.send(
      new ScanCommand({
        TableName: TableNames.REPUTATION,
        FilterExpression: "guildId = :guildId",
        ExpressionAttributeValues: {
          ":guildId": guildId
        }
      })
    );
    
    const reputations = response.Items || [];
    return reputations
      .sort((a, b) => b.points - a.points)
      .map(item => ({
        userId: item.userId,
        points: item.points
      }));
  }
  async getCurrencies(guildId: string): Promise<Currency[]> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.CURRENCIES,
        KeyConditionExpression: "guildId = :guildId",
        ExpressionAttributeValues: {
          ":guildId": guildId
        }
      })
    );
    return response.Items as Currency[] || [];
  }

  async createCurrency(currency: InsertCurrency): Promise<Currency> {
    const newCurrency = {
      id: Date.now(), // Usar timestamp como ID
      ...currency
    };

    await docClient.send(
      new PutCommand({
        TableName: TableNames.CURRENCIES,
        Item: newCurrency
      })
    );

    return newCurrency;
  }

  async deleteCurrency(guildId: string, name: string): Promise<boolean> {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TableNames.CURRENCIES,
          Key: {
            guildId: guildId,
            name: name
          }
        })
      );
      return true;
    } catch (error) {
      console.error("Error deleting currency:", error);
      return false;
    }
  }

  async getUserWallet(guildId: string, userId: string): Promise<UserWallet | undefined> {
    try {
      const response = await docClient.send(
        new GetCommand({
          TableName: TableNames.USER_WALLETS,
          Key: {
            guildId,
            userId
          }
        })
      );

      if (!response.Item) {
        // Si no existe, crear una nueva wallet
        return this.createUserWallet({
          guildId,
          userId
        });
      }

      const wallet = response.Item as UserWallet;
      return {
        ...wallet,
        lastWorked: wallet.lastWorked ? new Date(wallet.lastWorked) : null,
        lastStolen: wallet.lastStolen ? new Date(wallet.lastStolen) : null
      };
    } catch (error) {
      console.error('Error getting wallet:', error);
      // Si hay error, crear una nueva wallet
      return this.createUserWallet({
        guildId,
        userId
      });
    }
  }

  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    const newWallet: UserWallet = {
      id: Date.now(),
      ...wallet,
      wallet: {},
      lastWorked: null,
      lastStolen: null
    };

    await docClient.send(
      new PutCommand({
        TableName: TableNames.USER_WALLETS,
        Item: newWallet
      })
    );

    return newWallet;
  }

  async updateUserWallet(
    id: number,
    wallet: Record<string, number>,
    lastWorked?: Date,
    lastStolen?: Date
  ): Promise<UserWallet> {
    // Primero obtenemos el registro existente para conseguir guildId y userId
    const existingWallet = await this.getUserWalletById(id);
    if (!existingWallet) {
      throw new Error(`Wallet with id ${id} not found`);
    }

    const updatedWallet = {
      ...existingWallet,
      wallet,
      lastWorked: lastWorked ? lastWorked.toISOString() : existingWallet.lastWorked,
      lastStolen: lastStolen ? lastStolen.toISOString() : existingWallet.lastStolen
    };

    await docClient.send(
      new UpdateCommand({
        TableName: TableNames.USER_WALLETS,
        Key: {
          guildId: existingWallet.guildId,
          userId: existingWallet.userId
        },
        UpdateExpression: "set wallet = :w, lastWorked = :lw, lastStolen = :ls",
        ExpressionAttributeValues: {
          ":w": wallet,
          ":lw": updatedWallet.lastWorked,
          ":ls": updatedWallet.lastStolen
        }
      })
    );

    return updatedWallet;
  }

  async getGuildSettings(guildId: string): Promise<GuildSettings | undefined> {
    const response = await docClient.send(
      new GetCommand({
        TableName: TableNames.GUILD_SETTINGS,
        Key: {
          guildId: guildId
        }
      })
    );
    return response.Item as GuildSettings | undefined;
  }

  async setTransactionLogChannel(guildId: string, channelId: string): Promise<GuildSettings> {
    const settings: GuildSettings = {
      id: Date.now(),
      guildId,
      transactionLogChannel: channelId
    };

    await docClient.send(
      new PutCommand({
        TableName: TableNames.GUILD_SETTINGS,
        Item: settings
      })
    );

    return settings;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const newTransaction: Transaction = {
      id: Date.now(),
      ...transaction,
      timestamp: new Date()
    };

    await docClient.send(
      new PutCommand({
        TableName: TableNames.TRANSACTIONS,
        Item: {
          ...newTransaction,
          timestamp: newTransaction.timestamp.toISOString()
        }
      })
    );

    return newTransaction;
  }

  async getTransactions(guildId: string): Promise<Transaction[]> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.TRANSACTIONS,
        KeyConditionExpression: "guildId = :guildId",
        ExpressionAttributeValues: {
          ":guildId": guildId
        }
      })
    );

    return (response.Items || []).map(item => ({
      ...item,
      timestamp: new Date(item.timestamp)
    })) as Transaction[];
  }

  async transferCurrency(
    guildId: string,
    fromUserId: string,
    toUserId: string,
    currencyName: string,
    amount: number
  ): Promise<Transaction> {
    const fromWallet = await this.getUserWallet(guildId, fromUserId);
    const toWallet = await this.getUserWallet(guildId, toUserId);

    if (!fromWallet) {
      throw new Error("Source wallet not found");
    }

    if (!toWallet) {
      throw new Error("Destination wallet not found");
    }

    const currentBalance = fromWallet.wallet[currencyName] || 0;
    if (currentBalance < amount) {
      throw new Error("Insufficient funds");
    }

    // Update wallets
    const fromUpdated = { ...fromWallet.wallet };
    const toUpdated = { ...toWallet.wallet };

    fromUpdated[currencyName] = (fromUpdated[currencyName] || 0) - amount;
    toUpdated[currencyName] = (toUpdated[currencyName] || 0) + amount;

    await this.updateUserWallet(fromWallet.id, fromUpdated);
    await this.updateUserWallet(toWallet.id, toUpdated);

    // Create transaction record
    return this.createTransaction({
      guildId,
      fromUserId,
      toUserId,
      currencyName,
      amount
    });
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const newCharacter: Character = {
      id: Date.now(),
      guildId: character.guildId,
      userId: character.userId,
      name: character.name,
      level: character.level,
      class: character.class,
      race: character.race,
      createdAt: new Date(),
      imageUrl: character.imageUrl || null,
      n20Url: character.n20Url || null,
      rank: character.rank || 'Rango E',
      languages: []
    };

    await docClient.send(
      new PutCommand({
        TableName: TableNames.CHARACTERS,
        Item: {
          ...newCharacter,
          characterId: newCharacter.userId + '-' + newCharacter.name.toLowerCase(),
          createdAt: newCharacter.createdAt.toISOString()
        }
      })
    );

    return newCharacter;
  }

  async getCharacter(guildId: string, userId: string): Promise<Character | undefined> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.CHARACTERS,
        KeyConditionExpression: "guildId = :guildId",
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":guildId": guildId,
          ":userId": userId
        }
      })
    );

    const character = response.Items?.[0];
    return character ? {
      ...character,
      createdAt: new Date(character.createdAt)
    } as Character : undefined;
  }

  async getCharacters(guildId: string): Promise<Character[]> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.CHARACTERS,
        KeyConditionExpression: "guildId = :guildId",
        ExpressionAttributeValues: {
          ":guildId": guildId
        }
      })
    );

    return (response.Items || []).map(character => ({
      ...character,
      createdAt: new Date(character.createdAt)
    })) as Character[];
  }

  async updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character> {
    // Buscar el personaje usando scan
    const response = await docClient.send(
      new ScanCommand({
        TableName: TableNames.CHARACTERS,
        FilterExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": id
        }
      })
    );

    const existingCharacter = response.Items?.[0] as Character | undefined;
    if (!existingCharacter) {
      throw new Error(`Character with id ${id} not found`);
    }

    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    Object.entries(character).forEach(([key, value]) => {
      if (value !== undefined) {
        const attributeKey = `:${key}`;
        const nameKey = `#${key}`;
        updateExpressions.push(`${nameKey} = ${attributeKey}`);
        expressionAttributeValues[attributeKey] = value;
        expressionAttributeNames[nameKey] = key;
      }
    });

    if (updateExpressions.length > 0) {
      await docClient.send(
        new UpdateCommand({
          TableName: TableNames.CHARACTERS,
          Key: {
            guildId: existingCharacter.guildId,
            characterId: existingCharacter.userId + '-' + (character.name?.toLowerCase() || existingCharacter.name.toLowerCase())
          },
          UpdateExpression: `set ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: expressionAttributeNames
        })
      );
    }

    // Obtener el personaje actualizado
    const characters = await this.getCharacters(existingCharacter.guildId);
    const updatedCharacter = characters.find(c => c.id === id);
    if (!updatedCharacter) {
      throw new Error(`Failed to retrieve updated character with id ${id}`);
    }

    return updatedCharacter;
  }

  async deleteCharacter(id: number): Promise<boolean> {
    try {
      // Buscar el personaje usando scan
      const response = await docClient.send(
        new ScanCommand({
          TableName: TableNames.CHARACTERS,
          FilterExpression: "id = :id",
          ExpressionAttributeValues: {
            ":id": id
          }
        })
      );

      const character = response.Items?.[0] as Character | undefined;
      if (!character) {
        return false;
      }

      await docClient.send(
        new DeleteCommand({
          TableName: TableNames.CHARACTERS,
          Key: {
            guildId: character.guildId,
            characterId: character.userId + '-' + character.name.toLowerCase()
          }
        })
      );
      return true;
    } catch (error) {
      console.error("Error deleting character:", error);
      return false;
    }
  }

  // Método auxiliar para obtener wallet por ID
  private async getUserWalletById(id: number): Promise<UserWallet | undefined> {
    const response = await docClient.send(
      new ScanCommand({
        TableName: TableNames.USER_WALLETS,
        FilterExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": id
        }
      })
    );

    return response.Items?.[0] as UserWallet | undefined;
  }

  // Método auxiliar para obtener character por ID
  private async getCharacterById(id: number): Promise<Character | undefined> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.CHARACTERS,
        IndexName: "IdIndex",
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": id
        }
      })
    );

    const character = response.Items?.[0];
    return character ? {
      ...character,
      createdAt: new Date(character.createdAt)
    } as Character : undefined;
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const now = new Date();
    const shopId = `${shop.userId}-${Date.now()}`;
    const newShop: Shop = {
      id: Date.now(),
      shopId,
      ...shop,
      createdAt: now.toISOString(),
      lastPayout: null,
      weeklyIncome: 0
    };
    await docClient.send(new PutCommand({ 
      TableName: TableNames.SHOPS, 
      Item: newShop
    }));
    return {
      ...newShop,
      createdAt: now
    };
  }

  async getShopsByGuild(guildId: string): Promise<Shop[]> {
    const response = await docClient.send(new QueryCommand({
      TableName: TableNames.SHOPS,
      KeyConditionExpression: "guildId = :guildId",
      ExpressionAttributeValues: { ":guildId": guildId }
    }));
    return response.Items as Shop[] || [];
  }

  async getShopsByUser(guildId: string, userId: string): Promise<Shop[]> {
    const response = await docClient.send(new QueryCommand({
      TableName: TableNames.SHOPS,
      IndexName: "UserIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: { 
        ":userId": userId
      }
    }));
    return (response.Items || []).map(shop => ({
      ...shop,
      createdAt: new Date(shop.createdAt),
      lastPayout: shop.lastPayout ? new Date(shop.lastPayout) : null
    })) as Shop[];
  }

  async updateShopPayout(shopId: number, lastPayout: Date): Promise<void> {
    const response = await docClient.send(new ScanCommand({
      TableName: TableNames.SHOPS,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: { ":id": shopId }
    }));

    const shop = response.Items?.[0];
    if (!shop) {
      throw new Error(`Shop with id ${shopId} not found`);
    }

    await docClient.send(new UpdateCommand({
      TableName: TableNames.SHOPS,
      Key: { 
        guildId: shop.guildId,
        shopId: shop.shopId
      },
      UpdateExpression: "set lastPayout = :lp",
      ExpressionAttributeValues: { ":lp": lastPayout.toISOString() }
    }));
  }

  private async getShopById(id: number): Promise<Shop | undefined> {
    const response = await docClient.send(new QueryCommand({
      TableName: TableNames.SHOPS,
      IndexName: "IdIndex", // Assuming you have an index named IdIndex
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": id }
    }));
    return response.Items?.[0] as Shop | undefined;
  }

  async getAllWallets(guildId: string): Promise<UserWallet[]> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.USER_WALLETS,
        KeyConditionExpression: "guildId = :guildId",
        ExpressionAttributeValues: {
          ":guildId": guildId
        }
      })
    );

    return (response.Items || []).map(wallet => ({
      ...wallet,
      lastWorked: wallet.lastWorked ? new Date(wallet.lastWorked) : null,
      lastStolen: wallet.lastStolen ? new Date(wallet.lastStolen) : null
    })) as UserWallet[];
  }
}

export const storage = new DynamoDBStorage();