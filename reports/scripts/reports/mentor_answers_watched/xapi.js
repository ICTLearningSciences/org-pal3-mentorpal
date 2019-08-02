// const xapiQueryStatements = require('../xapi');

// xapiQueryStatements({
//   // verb: new TinCan.Verb({
//   //   id: 'https://mentorpal.org/xapi/verb/asked',
//   // }),
//   activity: 'https://dev.pal3.org/xapi/resources/5d1bc549becb4e208dd0188b',
//   since: '2019-07-31T00:00:00Z',
// })
//   .then(statements => {
//     console.log(`${JSON.stringify(statements, null, 2)}`);
//   })
//   .catch(err => {
//     console.error(err);
//   });

async function queryXapi({ since = '2019-07-31T00:00:00Z' } = {}) {
  console.log('ORIGINAL QUERY XAPI');
  return null;
}

module.exports = {
  queryXapi,
};
