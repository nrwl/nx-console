export type CloudConfig = {
  authConfig: {
    clientId: string;
    audience: string;
    domain: string;
  };
  endpoint: string;
  appUrl: string;
};

export const stagingConfig = {
  authConfig: {
    clientId: '11Zte67xGtfrGQhRVlz9zM8Fq0LvZYwe',
    audience: 'https://api.staging.nrwl.io/',
    domain: 'https://auth.staging.nx.app/login',
  },
  endpoint: 'https://staging.nx.app/api',
  appUrl: 'https://staging.nx.app',
};

export const prodConfig = {
  authConfig: {
    clientId: 'm6PYBsCK1t2DTKnbE30n029C22fqtTMm',
    audience: 'https://api.nrwl.io/',
    domain: 'https://auth.nx.app/login',
  },
  endpoint: 'https://cloud.nx.app/api',
  appUrl: 'https://cloud.nx.app',
};
