import { docClient, TableNames } from "./dynamodb";
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { logger } from "./utils/logger";

export class DynamoDBStorage implements IStorage {
  async getCurrencies(guildId: string): Promise<Currency[]> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.CURRENCIES,
        KeyConditionExpression: "guildId = :guildId",
        ExpressionAttributeValues: { ":guildId": guildId }
      })
    );
    return response.Items as Currency[] || [];
  }

  async createCurrency(currency: InsertCurrency): Promise<Currency> {
    const newCurrency = { id: Date.now(), ...currency };
    await docClient.send(
      new PutCommand({ TableName: TableNames.CURRENCIES, Item: newCurrency })
    );
    return newCurrency;
  }

  async deleteCurrency(guildId: string, name: string): Promise<boolean> {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TableNames.CURRENCIES,
          Key: { guildId, name }
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
      new GetCommand({ TableName: TableNames.USER_WALLETS, Key: { guildId, userId } })
    );
    if (!response.Item) return undefined;
    return { ...response.Item, lastWorked: response.Item.lastWorked ? new Date(response.Item.lastWorked) : null, lastStolen: response.Item.lastStolen ? new Date(response.Item.lastStolen) : null };
  }

  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    const newWallet: UserWallet = { id: Date.now(), ...wallet, wallet: {}, lastWorked: null, lastStolen: null };
    await docClient.send(
      new PutCommand({ TableName: TableNames.USER_WALLETS, Item: newWallet })
    );
    return newWallet;
  }

  async getCharacterById(characterId: string): Promise<Character | null> {
    try {
      const response = await docClient.send(
        new ScanCommand({
          TableName: TableNames.CHARACTERS,
          FilterExpression: "characterId = :characterId",
          ExpressionAttributeValues: { ":characterId": characterId }
        })
      );
      return response.Items?.[0] || null;
    } catch (error) {
      console.error("Error buscando personaje:", error);
      return null;
    }
  }

  async deleteCharacter(characterId: string): Promise<boolean> {
    try {
      const character = await this.getCharacterById(characterId);
      if (!character) {
        console.error(`Character with characterId "${characterId}" not found.`);
        return false;
      }
      await docClient.send(
        new DeleteCommand({ TableName: TableNames.CHARACTERS, Key: { guildId: character.guildId, id: character.id } })
      );
      return true;
    } catch (error) {
      console.error("Error deleting character:", error);
      return false;
    }
  }
}

export const storage = new DynamoDBStorage();

