// src/data/databaseAdapter.js

class DatabaseAdapter {
  constructor(config) {
    this.type = config.type || "indexeddb";
    this.connection = null;
    this.adapters = {
      indexeddb: new IndexedDBAdapter(),
      postgresql: new PostgreSQLAdapter(),
      mongodb: new MongoDBAdapter(),
      s3: new S3Adapter(),
    };
  }

  async connect() {
    this.connection = await this.adapters[this.type].connect();
    return this.connection;
  }

  // Unified API regardless of backend
  async query(collection, query, options = {}) {
    return this.adapters[this.type].query(collection, query, options);
  }

  // Support for complex queries
  async aggregate(collection, pipeline) {
    if (this.adapters[this.type].aggregate) {
      return this.adapters[this.type].aggregate(collection, pipeline);
    }
    // Fallback to client-side aggregation
    const data = await this.query(collection, {});
    return this.clientSideAggregate(data, pipeline);
  }

  // Transaction support
  async transaction(operations) {
    if (this.adapters[this.type].transaction) {
      return this.adapters[this.type].transaction(operations);
    }
    // Fallback to sequential operations
    const results = [];
    for (const op of operations) {
      results.push(await this[op.method](...op.args));
    }
    return results;
  }
}
