const chai = require("chai");
const csv = require("csvtojson");
const fs = require("fs-extra");
const path = require("path");
const sinon = require("sinon");

const { expect } = chai;

const report = require("../../../scripts/reports/mentor-answers-watched/report");
const xapi = require("../../../scripts/reports/mentor-answers-watched/xapi");

describe("reports/mentor-answers-watched", async () => {
  let queryXapiStub;
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    queryXapiStub = sinon.stub();
    sinon.replace(xapi, "queryXapi", queryXapiStub);
  });

  it(`generates json and csv rollups of mentor answers for one user/session - example`, async () => {
    function readMAWResource(rpath) {
      return fs.readFileSync(path.join(__dirname, rpath), "utf8");
    }

    function readMAWResourceJson(rpath) {
      return JSON.parse(readMAWResource(rpath));
    }

    async function readMAWResourceCsv(rpath) {
      return await csv().fromString(readMAWResource(rpath));
    }

    const expectedXapiStmts = readMAWResourceJson(
      "./mentor-answers-watched.resources/one-user-session/expected-xapi-statements.json"
    );
    const expectedReportJson = readMAWResourceJson(
      "./mentor-answers-watched.resources/one-user-session/expected-report.json"
    );
    const expectedReportCsv = await readMAWResourceCsv(
      "./mentor-answers-watched.resources/one-user-session/expected-report.csv"
    );
    queryXapiStub.returns(Promise.resolve(expectedXapiStmts));
    const reportJson = await report.runReport();
    expect(reportJson).to.eql(expectedReportJson);
    const reportCsvStr = report.reportJsonToCsv(reportJson);
    const reportCsv = await csv().fromString(reportCsvStr);
    expect(reportCsv).to.eql(expectedReportCsv);
  });
});
