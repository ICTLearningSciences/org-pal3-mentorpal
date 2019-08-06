const chai = require('chai');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');

const { expect } = chai;

const report = require('../../../scripts/reports/mentor_answers_watched/report');
const xapi = require('../../../scripts/reports/mentor_answers_watched/xapi');

const exampleSessionsByUser = require('./mentor_answers_watched.resources/example_sessions_by_user.json');

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
    const examples_one_user_session = [
      {
        xapi_data: exampleSessionsByUser['larry201907291740'],
        expected_report_json: JSON.parse(
          readMAWResource(
            './mentor_answers_watched.resources/one_user_session/expected_report.json'
          )
        ),
      },
    ];
    // for (let i = 0; i< examples_one_user_session.length; i++) {
    //   const ex = examples_one_user_session[i];
    const ex = examples_one_user_session[0];

    it(`generates json and csv rollups of mentor answers for one user/session - example`, async () => {
      queryXapiStub.returns(Promise.resolve(ex.xapi_data));
      const reportJson = await report.runReport();
      // expect(queryXapiStub.callCount).to.eql(1);
      expect(reportJson).to.eql(ex.expected_report_json);
      // const reportCsv = report.reportJsonToCsv(reportJson);
      // expect(reportCsv).to.eql(ex.expected_report_csv);
    });
  });
});
