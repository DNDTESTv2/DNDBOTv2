import { docClient, TableNames } from "./dynamodb";
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { currencies, userWallets, guildSettings, transactions, characters, 
  type Currency, type UserWallet, type GuildSettings, type Transaction, type Character,
  type InsertCurrency, type InsertUserWallet, type InsertGuildSettings, type InsertTransaction, type InsertCharacter 
} from "@shared/schema";

export class DynamoDBStorage implements IStorage {
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
    const response = await docClient.send(
      new GetCommand({
        TableName: TableNames.USER_WALLETS,
        Key: {
          guildId: guildId,
          userId: userId
        }
      })
    );

    if (!response.Item) return undefined;

    const wallet = response.Item as UserWallet;
    return {
      ...wallet,
      lastWorked: wallet.lastWorked ? new Date(wallet.lastWorked) : null,
      lastStolen: wallet.lastStolen ? new Date(wallet.lastStolen) : null
    };
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
      ...character,
      createdAt: new Date(),
      imageUrl: character.imageUrl ?? null,
      n20Url: character.n20Url ?? null,
      rank: character.rank || 'Rango E',
      alignment: null,
      languages: []
    };

    // Generate a unique characterId using the same format as in deleteCharacter
    const characterId = `${character.userId}_${newCharacter.id}`;

    console.log(`Creating character:`, {
      id: newCharacter.id,
      characterId,
      guildId: character.guildId,
      userId: character.userId,
      name: character.name
    });

    await docClient.send(
      new PutCommand({
        TableName: TableNames.CHARACTERS,
        Item: {
          ...newCharacter,
          characterId,
          guildId: character.guildId,
          userId: character.userId,
          createdAt: newCharacter.createdAt.toISOString()
        }
      })
    );

    return newCharacter;
  }

  async getCharacters(guildId: string): Promise<Character[]> {
    console.log(`Consultando personajes para el servidor ${guildId}`);

    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.CHARACTERS,
        KeyConditionExpression: "guildId = :guildId",
        ExpressionAttributeValues: {
          ":guildId": guildId
        }
      })
    );

    console.log(`Encontrados ${response.Items?.length || 0} personajes en total`);

    // Convertir todas las fechas de string a Date y asegurarse de que todos los campos estén presentes
    const characters = (response.Items || []).map(character => ({
      ...character,
      createdAt: new Date(character.createdAt),
      imageUrl: character.imageUrl || null,
      n20Url: character.n20Url || null,
      rank: character.rank || 'Rango E',
      alignment: character.alignment || null,
      languages: character.languages || []
    })) as Character[];

    console.log(`Personajes procesados: ${characters.length}`);
    return characters;
  }

  async getCharacter(guildId: string, userId: string, name?: string): Promise<Character | undefined> {
    // First try to get all characters for this user in this guild
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.CHARACTERS,
        IndexName: "UserIndex",
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "guildId = :guildId",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":guildId": guildId
        }
      })
    );

    if (!response.Items || response.Items.length === 0) {
      return undefined;
    }

    let character;
    if (name) {
      // If name is provided, try to find an exact match
      character = response.Items.find(
        c => c.name.toLowerCase() === name.toLowerCase()
      );
    }

    // If no name provided or no exact match found, return the first character
    character = character || response.Items[0];

    return {
      ...character,
      createdAt: new Date(character.createdAt)
    } as Character;
  }

  async updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character> {
    // Primero obtenemos el registro existente para conseguir guildId
    const existingCharacter = await this.getCharacterById(id);
    if (!existingCharacter) {
      throw new Error(`Character with id ${id} not found`);
    }

    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    Object.entries(character).forEach(([key, value]) => {
      const attributeKey = `:${key}`;
      const nameKey = `#${key}`;
      updateExpressions.push(`${nameKey} = ${attributeKey}`);
      expressionAttributeValues[attributeKey] = value;
      expressionAttributeNames[nameKey] = key;
    });

    await docClient.send(
      new UpdateCommand({
        TableName: TableNames.CHARACTERS,
        Key: {
          guildId: existingCharacter.guildId,
          userId: existingCharacter.userId
        },
        UpdateExpression: `set ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames
      })
    );

    // Obtener el personaje actualizado
    const updatedCharacter = await this.getCharacter(existingCharacter.guildId, existingCharacter.userId);
    if (!updatedCharacter) {
      throw new Error(`Failed to retrieve updated character with id ${id}`);
    }

    return updatedCharacter;
  }

  async deleteCharacter(id: number): Promise<boolean> {
    try {
      // Primero encontramos el personaje usando el índice de ID
      const character = await this.getCharacterById(id);
      if (!character) {
        console.error(`No se encontró el personaje con ID ${id}`);
        return false;
      }

      // Generamos el characterId usando el mismo formato que en createCharacter
      const characterId = `${character.userId}_${id}`;

      console.log(`Eliminando personaje:`, {
        id,
        characterId,
        guildId: character.guildId,
        userId: character.userId,
        name: character.name
      });

      await docClient.send(
        new DeleteCommand({
          TableName: TableNames.CHARACTERS,
          Key: {
            guildId: character.guildId,
            characterId: characterId
          },
          ConditionExpression: "attribute_exists(characterId)"
        })
      );

      console.log(`Personaje eliminado exitosamente: ${character.name}`);
      return true;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.error(`Character ${id} was not found or already deleted`);
      } else {
        console.error("Error al eliminar personaje:", error);
      }
      return false;
    }
  }

  // Método auxiliar para obtener wallet por ID
  private async getUserWalletById(id: number): Promise<UserWallet | undefined> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.USER_WALLETS,
        IndexName: "IdIndex",
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": id
        }
      })
    );

    return response.Items?.[0] as UserWallet | undefined;
  }

  // Método auxiliar para obtener character por ID
  private async getCharacterById(id: number): Promise<Character | undefined> {
    try {
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

      if (!response.Items || response.Items.length === 0) {
        return undefined;
      }

      const character = response.Items[0] as Character;
      return {
        ...character,
        createdAt: new Date(character.createdAt)
      };
    } catch (error) {
      console.error("Error al obtener personaje por ID:", error);
      return undefined;
    }
  }
}

export const storage = new DynamoDBStorage();