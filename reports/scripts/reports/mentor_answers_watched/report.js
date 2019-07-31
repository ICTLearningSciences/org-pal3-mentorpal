const xapi = require('./xapi');

async function runReport({ since = '2019-07-31T00:00:00Z' } = {}) {
  const statements = await xapi.queryXapi({ since });
  console.log(`queryXapi=${JSON.stringify(statements, null, 2)}`);
}

module.exports = {
  runReport,
};
