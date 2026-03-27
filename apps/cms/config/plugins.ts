export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '7d',
      },
      jwtSecret: env('JWT_SECRET'),
    },
  },
  i18n: {
    enabled: true,
  },
});
