const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

export default {
  datasource: {
    provider: 'sqlite',
    url: databaseUrl,
  },
};
