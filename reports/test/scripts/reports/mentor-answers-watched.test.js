const chai = require('chai');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');

const { expect } = chai;

const report = require('../../../scripts/reports/mentor-answers-watched/report');
const xapi = require('../../../scripts/reports/mentor-answers-watched/xapi');

describe('reports/mentor-answers-watched', async () => {
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

    expectedXapiStmts = readMAWResourceJson(
      './mentor-answers-watched.resources/one-user-session/expected-xapi-statements.json'
    );
    expectedReportJson = readMAWResourceJson(
      './mentor-answers-watched.resources/one-user-session/expected-report.json'
    );
    expectedReportCsv = readMAWResource(
      './mentor-answers-watched.resources/one-user-session/expected-report.csv'
    );

    // console.log(`expectedReportCsv=${expectedReportCsv}`)

    it(`generates json and csv rollups of mentor answers for one user/session - example`, async () => {
      queryXapiStub.returns(Promise.resolve(expectedXapiStmts));
      const reportJson = await report.runReport();
      expect(reportJson).to.eql(expectedReportJson);
      const reportCsv = report.reportJsonToCsv(reportJson);
      // console.log(`reportCsv=${reportCsv}`)
      expect(reportCsv).to.eql(expectedReportCsv);
    });
  });
});
