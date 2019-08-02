const path = require('path');
const program = require('commander');
const fs = require('fs-extra');

const {
  statementsToReportJson,
} = require('./reports/mentor_answers_watched/report');

program
  .version('1.0.0')
  .option('-d, --dir [dir]', 'dir')
  .parse(process.argv);

const stPath = path.join(program.dir, 'xapi-statements.json');
const statements = JSON.parse(fs.readFileSync(stPath));
const json = statementsToReportJson(statements);
const resultPath = path.join(program.dir, 'report.json');
fs.writeFileSync(resultPath, JSON.stringify(json, null, 2));
