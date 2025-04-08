import Resolver from '@forge/resolver';

const resolver = new Resolver();

resolver.define('getText', (req) => {
  console.log(req);

  return 'Hello, world!'; // Default return value
});

export const handler = resolver.getDefinitions();
