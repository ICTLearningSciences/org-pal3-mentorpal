require('dotenv').config();
const program = require('commander');
const fs = require('fs-extra');
// const TinCan = require('tincanjs');

const { queryStatements } = require('./xapi');

program
  .version('1.0.0')
  .option('-s, --since [since]', 'since')
  .option('-o, --output [output]', 'output')
  .parse(process.argv);

function queryAll(queries) {
  return new Promise((resolve, reject) => {
    Promise.all(queries.map(q => queryStatements(q)))
      .then(queryResults => {
        const result = queryResults.reduce((acc, cur) => [...acc, ...cur], []);
        result.sort((a, b) => (a.stored > b.stored ? 1 : -1));
        resolve(result);
      })
      .catch(err => reject(err));
  });
}

queryAll([
  { verb: 'https://mentorpal.org/xapi/verb/asked', since: program.since },
  { verb: 'https://mentorpal.org/xapi/verb/answered', since: program.since },
])
  .then(statements => {
    if (program.output) {
      console.log(`writing to ${program.output}`);
      fs.writeFileSync(program.output, JSON.stringify(statements, null, 2));
      return;
    }
    console.log(`${JSON.stringify(statements, null, 2)}`);
  })
  .catch(err => {
    console.error(err);
  });
