const path = require('path');
const program = require('commander');
const fs = require('fs-extra');

const {
  reportJsonToCsv,
} = require('./reports/mentor_answers_watched/report');

program
  .version('1.0.0')
  .option('-d, --dir [dir]', 'dir')
  .parse(process.argv);

const jsonPath = path.join(program.dir, 'report.json');
const json = JSON.parse(fs.readFileSync(jsonPath));
const resultPath = path.join(program.dir, 'report.csv');
const csv = reportJsonToCsv(json)
fs.writeFileSync(resultPath, csv);
