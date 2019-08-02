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

queryStatements({
  // verb: new TinCan.Verb({
  //   id: 'https://mentorpal.org/xapi/verb/asked',
  // }),
  activity: 'https://dev.pal3.org/xapi/resources/5d1bc549becb4e208dd0188b',
  since: program.since,
})
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
