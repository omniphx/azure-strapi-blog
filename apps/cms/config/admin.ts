export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  flags: {
    nps: env('FLAG_NPS', 'true') === 'true',
    promoteEE: env('FLAG_PROMOTE_EE', 'true') === 'true',
  },
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  url: env('PUBLIC_ADMIN_URL', '/dashboard'),
});
