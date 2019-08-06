const chai = require('chai');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');

const { expect } = chai;

const report = require('../../../scripts/reports/mentor_answers_watched/report');
const xapi = require('../../../scripts/reports/mentor_answers_watched/xapi');

describe('reports/mentor_answers_watched', async () => {
  let queryXapiStub;
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    queryXapiStub = sinon.stub();
    sinon.replace(xapi, 'queryXapi', queryXapiStub);
  });

  describe('generates a rollup of mentor answers for one user/session', () => {
    function readMAWResource(rpath) {
      return fs.readFileSync(path.join(__dirname, rpath), 'utf8');
    }

    function readMAWResourceJson(rpath) {
      return JSON.parse(readMAWResource(rpath));
    }

    const examples_one_user_session = [
      {
        expected_xapi_statements: readMAWResourceJson(
          './mentor_answers_watched.resources/one_user_session/expected_xapi_statements.json'
        ),
        expected_report_json: readMAWResourceJson(
          './mentor_answers_watched.resources/one_user_session/expected_report.json'
        ),
        expected_report_csv: readMAWResource(
          './mentor_answers_watched.resources/one_user_session/expected_report.csv'
        ),
      },
    ];
    const ex = examples_one_user_session[0];

    it(`generates json and csv rollups of mentor answers for one user/session - example`, async () => {
      queryXapiStub.returns(Promise.resolve(ex.expected_xapi_statements));
      const reportJson = await report.runReport();
      expect(reportJson).to.eql(ex.expected_report_json);
      const reportCsv = report.reportJsonToCsv(reportJson);
      expect(reportCsv).to.eql(ex.expected_report_csv);
    });
  });
});
