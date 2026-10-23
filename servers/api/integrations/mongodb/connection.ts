import mongoose from "mongoose";
import type { Logger } from "@workspace/logging";
import type { MongoClient, MongoDbIntegration } from "./types.js";

type MongoDbIntegrationDependencies = Readonly<{
  uri?: string;
  logger: Logger;
  client?: MongoClient;
}>;

const mongooseClient: MongoClient = Object.freeze({
  connect: (uri: string): Promise<unknown> => mongoose.connect(uri),
  assertTransactionsSupported: async (): Promise<void> => {
    const database = mongoose.connection.db;
    if (!database) throw new Error("MongoDB connection is not ready for topology checks.");
    const topology: unknown = await database.admin().command({ hello: 1 });
    if (typeof topology !== "object" || topology === null
      || !("setName" in topology && typeof topology.setName === "string")
        && !("msg" in topology && topology.msg === "isdbgrid")) {
      throw new Error("MongoDB transactions require a replica set or sharded cluster.");
    }
  },
  disconnect: (): Promise<void> => mongoose.disconnect()
});

export const createMongoDbIntegration = ({
  uri,
  logger,
  client = mongooseClient
}: MongoDbIntegrationDependencies): MongoDbIntegration => {
  if (!uri) {
    return Object.freeze({
      connect: (): Promise<void> => {
        logger.info("MongoDB connection is not configured; starting without persistence.");
        return Promise.resolve();
      },
      disconnect: (): Promise<void> => Promise.resolve()
    });
  }

  return Object.freeze({
    connect: async (): Promise<void> => {
      await client.connect(uri);
      try {
        await client.assertTransactionsSupported();
      } catch (error) {
        await client.disconnect().catch(() => undefined);
        throw error;
      }
      logger.info("MongoDB connection established.");
    },
    disconnect: async (): Promise<void> => {
      await client.disconnect();
    }
  });
};
