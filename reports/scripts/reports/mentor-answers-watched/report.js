const { parse } = require('json2csv');
const xapi = require('./xapi');
const {
  getObjectId,
  getUserDomain,
  getUserId,
  getUserName,
  groupStatementsByQuestionIndex,
  groupStatementsByMentor,
  statementsToSessions,
  statementExtValues,
  timestampAnswered,
  timestampAsked,
} = require('../../xapi');

const CSV_FIELDS = [
  'answer_confidence',
  'answer_text',
  'mentor',
  'mentor_list',
  'question_index',
  'question_text',
  'resource_id',
  'session_id',
  'timestamp_answered',
  'timestamp_asked',
  'user_domain',
  'user_id',
  'user_name',
];

function toQuesMentorResult(statements, sessId) {
  const result = statements.reduce((accResult, curStmt) => {
    const curStMentorpalVals = statementExtValues(curStmt, {
      context: ['mentor_list'],
      result: [
        'answer_duration',
        'answer_text',
        'confidence',
        'mentor',
        'question_text',
        'question',
        'question_index',
      ],
    });
    return {
      answer_confidence:
        accResult.answer_confidence || curStMentorpalVals.confidence,
      // answer_duration:
      //   qsAcc.answer_duration || curStMentorpalVals.answer_duration,
      answer_text: accResult.answer_text || curStMentorpalVals.answer_text,
      mentor: accResult.mentor || curStMentorpalVals.mentor,
      mentor_list:
        typeof curStMentorpalVals.mentor_list === 'string' &&
        curStMentorpalVals.mentor_list.length > 0
          ? curStMentorpalVals.mentor_list
          : (curStMentorpalVals.mentor_list || []).sort().join(','),
      question_index:
        accResult.question_index || curStMentorpalVals.question_index,
      question_text:
        accResult.question_text ||
        curStMentorpalVals.question_text ||
        curStMentorpalVals.question,
      resource_id: accResult.resource_id || getObjectId(curStmt),
      session_id: sessId,
      user_domain: accResult.user_domain || getUserDomain(curStmt),
      user_id: accResult.user_id || getUserId(curStmt),
      user_name: accResult.user_name || getUserName(curStmt),
    };
  }, {});
  return result;
}

function statementsToReportJson(statements) {
  const sessionsById = statementsToSessions(statements);
  const sessQuesBySessId = Object.getOwnPropertyNames(sessionsById).reduce(
    (acc, cur) => {
      acc[cur] = groupStatementsByQuestionIndex(sessionsById[cur]);
      return acc;
    },
    {}
  );
  const result = Object.getOwnPropertyNames(sessQuesBySessId).reduce(
    (accResult, curSessId) => {
      const sessStmtsByQuestionIx = sessQuesBySessId[curSessId];
      const sessResults = sessStmtsByQuestionIx.reduce(
        (accSessResults, quesStmts) => {
          if (!Array.isArray(quesStmts) || quesStmts.length == 0) {
            return accSessResults;
          }
          const byMentor = groupStatementsByMentor(quesStmts);
          const tsAsked = timestampAsked(quesStmts);
          const sessQuesMentorResults = Object.getOwnPropertyNames(
            byMentor
          ).reduce((allMentors, curMentor) => {
            const tsAnswered = timestampAnswered(byMentor[curMentor]);
            const curMentorResult = {
              ...toQuesMentorResult(byMentor[curMentor], curSessId),
              timestamp_asked: tsAsked,
              timestamp_answered: tsAnswered,
            };
            return [...allMentors, curMentorResult];
          }, []);

          return [...accSessResults, ...sessQuesMentorResults];
        },
        []
      );
      return [...accResult, ...sessResults];
    },
    []
  );
  return result;
}

function reportJsonToCsv(reportJson) {
  try {
    const csv = parse(reportJson, { fields: CSV_FIELDS });
    return csv;
  } catch (err) {
    console.error(err);
  }
}

async function runReport({ since = '2019-07-31T00:00:00Z' } = {}) {
  const statements = await xapi.queryXapi({ since });
  const reportJson = statementsToReportJson(statements);
  return reportJson;
}

module.exports = {
  reportJsonToCsv,
  runReport,
  statementsToReportJson,
};
