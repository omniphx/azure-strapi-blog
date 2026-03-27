import path from 'path';

export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  const connections: Record<string, object> = {
    sqlite: {
      connection: {
        filename: path.join(
          __dirname,
          '..',
          env('DATABASE_FILENAME', '.tmp/data.db')
        ),
      },
      useNullAsDefault: true,
    },
    postgres: {
      connection: {
        host: env('DATABASE_HOST', '127.0.0.1'),
        port: parseInt(env('DATABASE_PORT', '5432'), 10),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env('DATABASE_SSL', 'false') === 'true'
          ? { rejectUnauthorized: env('DATABASE_SSL_REJECT_UNAUTHORIZED', 'true') === 'true' }
          : false,
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        min: parseInt(env('DATABASE_POOL_MIN', '2'), 10),
        max: parseInt(env('DATABASE_POOL_MAX', '10'), 10),
      },
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: parseInt(env('DATABASE_CONNECTION_TIMEOUT', '60000'), 10),
    },
  };
};
