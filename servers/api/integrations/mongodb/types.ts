export type MongoClient = Readonly<{
  connect: (uri: string) => Promise<unknown>;
  disconnect: () => Promise<void>;
}>;

export type MongoDbIntegration = Readonly<{
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}>;
