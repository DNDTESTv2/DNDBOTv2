import { docClient, TableNames } from "./dynamodb";
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { logger } from "./utils/logger";

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

    // Generar el characterId
    const characterId = `${character.userId}_${newCharacter.id}`;

    logger.info('Creando personaje:', {
      operation: 'CREATE',
      id: newCharacter.id,
      characterId,
      guildId: character.guildId,
      userId: character.userId,
      name: character.name,
      fullItem: JSON.stringify({
        ...newCharacter,
        characterId,
        createdAt: newCharacter.createdAt.toISOString()
      }, null, 2)
    });

    await docClient.send(
      new PutCommand({
        TableName: TableNames.CHARACTERS,
        Item: {
          ...newCharacter,
          characterId,
          createdAt: newCharacter.createdAt.toISOString()
        }
      })
    );

    // Verificar que se guardó correctamente
    const savedCharacter = await this.getCharacter(character.guildId, character.userId, character.name);
    logger.info('Resultado de creación:', {
      operation: 'CREATE_VERIFY',
      id: newCharacter.id,
      saved: !!savedCharacter,
      savedData: savedCharacter ? JSON.stringify(savedCharacter, null, 2) : null
    });

    return newCharacter;
  }

  async getCharacters(guildId: string): Promise<Character[]> {
    logger.info(`Consultando personajes para el servidor ${guildId}`);

    try {
      const response = await docClient.send(
        new QueryCommand({
          TableName: TableNames.CHARACTERS,
          KeyConditionExpression: "guildId = :guildId",
          ExpressionAttributeValues: {
            ":guildId": guildId
          }
        })
      );

      logger.info(`Encontrados ${response.Items?.length || 0} personajes`);

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

      logger.info('Personajes procesados:', {
        count: characters.length,
        firstCharacter: characters.length > 0 ? JSON.stringify(characters[0], null, 2) : null
      });

      return characters;
    } catch (error) {
      logger.error('Error al obtener personajes:', {
        guildId,
        error: JSON.stringify(error, null, 2)
      });
      return [];
    }
  }

  async getCharacter(guildId: string, userId: string, name?: string): Promise<Character | undefined> {
    // First try to get all characters for this user in this guild
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.CHARACTERS,
        //IndexName: "UserIndex", //Removed IndexName
        KeyConditionExpression: "userId = :userId AND guildId = :guildId", //Modified KeyConditionExpression
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
    const existingCharacter = await this.getCharacter(character.guildId, character.userId, character.name);
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
          characterId: existingCharacter.characterId
        },
        UpdateExpression: `set ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames
      })
    );

    // Obtener el personaje actualizado
    const updatedCharacter = await this.getCharacter(existingCharacter.guildId, existingCharacter.userId, existingCharacter.name);
    if (!updatedCharacter) {
      throw new Error(`Failed to retrieve updated character with id ${id}`);
    }

    return updatedCharacter;
  }
  
  async deleteCharacter(guildId: string, name: string): Promise<boolean> {
    try {
        console.log(`Buscando personaje: ${name} en guild: ${guildId}`);

        // Buscar personaje con scan porque name no es parte de la clave primaria
        const response = await docClient.send(
            new ScanCommand({
                TableName: TableNames.CHARACTERS,
                FilterExpression: "guildId = :guildId AND #nm = :name",
                ExpressionAttributeValues: {
                    ":guildId": guildId,
                    ":name": name
                },
                ExpressionAttributeNames: {
                    "#nm": "name" // Para evitar conflictos con palabras reservadas
                }
            })
        );

        console.log("Respuesta de DynamoDB:", response.Items);

        if (!response.Items || response.Items.length === 0) {
            console.error(`Personaje "${name}" no encontrado en la guild "${guildId}".`);
            return false;
        }

        const characterId = response.Items[0].id; // Suponiendo que el ID está en la respuesta

        console.log(`Eliminando personaje con ID: ${characterId}`);

        // Ahora eliminamos el personaje con su ID
        await docClient.send(
            new DeleteCommand({
                TableName: TableNames.CHARACTERS,
                Key: {
                    guildId: guildId,
                    id: characterId // Eliminamos por ID
                }
            })
        );

        console.log(`Personaje "${name}" eliminado exitosamente.`);
        return true;
    } catch (error) {
        console.error("Error eliminando personaje:", error);
        return false;
    }
}


/*
  async deleteCharacter(id: number, guildId: string): Promise<boolean> {
    try {
      logger.info('Iniciando eliminación:', {
        operation: 'DELETE_START',
        id,
        guildId
      });

      // Primero obtenemos todos los personajes del servidor
      const characters = await this.getCharacters(guildId);
      
      // Buscamos el personaje específico por id
      const character = characters.find(c => c.id === id);

      if (!character) {
        logger.error('No se encontró el personaje:', {
          operation: 'DELETE_ERROR',
          id,
          reason: 'CHARACTER_NOT_FOUND'
        });
        return false;
      }

      logger.info('Personaje encontrado:', {
        operation: 'DELETE_FOUND',
        id,
        character: JSON.stringify(character, null, 2)
      });

      // Verificar que tenemos las claves necesarias
      if (!character.guildId || !character.characterId) {
        logger.error('Faltan claves necesarias:', {
          operation: 'DELETE_ERROR',
          id,
          guildId: character.guildId,
          characterId: character.characterId,
          reason: 'MISSING_KEYS'
        });
        return false;
      }

      // Comando de eliminación usando el id como clave de partición
      const deleteCommand = new DeleteCommand({
        TableName: TableNames.CHARACTERS,
        Key: {
          id: character.id,
          guildId: character.guildId
        },
        ConditionExpression: "attribute_exists(id)"
      });

      logger.info('Ejecutando eliminación:', {
        operation: 'DELETE_EXECUTE',
        id,
        command: JSON.stringify(deleteCommand.input, null, 2)
      });

      const deleteResult = await docClient.send(deleteCommand);

      logger.info('Personaje eliminado:', {
        operation: 'DELETE_SUCCESS',
        id,
        result: JSON.stringify(deleteResult, null, 2)
      });

      return true;
    } catch (error) {
      logger.error('Error en eliminación:', {
        operation: 'DELETE_ERROR',
        id,
        errorType: error.name,
        errorMessage: error.message,
        fullError: JSON.stringify(error, null, 2)
      });
      return false;
    }
  }
*/
  private async getUserWalletById(id: number): Promise<UserWallet | undefined> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TableNames.USER_WALLETS,
        //IndexName: "IdIndex", //Removed IndexName
        KeyConditionExpression: "guildId = :guildId AND userId = :userId", //Modified KeyConditionExpression
        ExpressionAttributeValues: {
          ":id": id
        }
      })
    );

    return response.Items?.[0] as UserWallet | undefined;
  }
}

export const storage = new DynamoDBStorage();
