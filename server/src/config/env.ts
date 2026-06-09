export const ENV = {
  ALLOWED_ORIGINS: (process.env.CLIENT_URL!).split(',').map(url => url.trim()),
};
