require('dotenv').config();
const TinCan = require('tincanjs');

function requireEnv(name) {
  const val = process.env[name];
  if (val) {
    return val;
  }
  throw new Error(
    `required env variable '${name}' is not defined. Make sure .env file exists in root and has ${name} set`
  );
}
// TinCan.DEBUG = true;

const lrs = new TinCan.LRS({
  endpoint: requireEnv('XAPI_ENDPOINT'),
  username: requireEnv('XAPI_USERNAME'),
  password: requireEnv('XAPI_PASSWORD'),
  allowFail: false,
});

function queryStatements(params) {
  return new Promise((resolve, reject) => {
    lrs.queryStatements({
      params: params,
      callback: function(err, sr) {
        if (err) {
          console.error(err);
          return reject(err);
        }

        if (sr.more !== null) {
          // TODO: additional page(s) of statements should be fetched
        }

        if (!Array.isArray(sr.statements) || sr.statements.length == 0) {
          return resolve([]);
        }

        return resolve(sr.statements.map(s => s.asVersion()));
      },
    });
  });
}

export 
