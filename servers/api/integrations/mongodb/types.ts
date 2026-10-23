export type MongoClient = Readonly<{
  connect: (uri: string) => Promise<unknown>;
  assertTransactionsSupported: () => Promise<void>;
  disconnect: () => Promise<void>;
}>;

export type MongoDbIntegration = Readonly<{
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}>;
