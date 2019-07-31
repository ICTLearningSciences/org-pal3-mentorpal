require('dotenv').config();
const TinCan = require('tincanjs');

const queryStatements = require('./utils/xapi');

queryStatements({
  // verb: new TinCan.Verb({
  //   id: 'https://mentorpal.org/xapi/verb/asked',
  // }),
  activity: 'https://dev.pal3.org/xapi/resources/5bfef7dbbecb4e208d3c856d',
  since: '2019-07-29T00:00:00Z',
})
  .then(statements => {
    console.log(`RESULT=${JSON.stringify(statements, null, 2)}`);
  })
  .catch(err => {
    console.error(err);
  });
