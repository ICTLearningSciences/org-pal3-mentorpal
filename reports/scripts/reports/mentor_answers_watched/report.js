const xapi = require('./xapi');
const {
  getObjectId,
  getUserDomain,
  getUserId,
  getUserName,
  groupStatementsByQuestionIndex,
  groupStatementsByMentor,
  statementsToSessions,
  statementMentorResponseValue,
} = require('../../xapi');

function toQuesMentorResult(statements, sessId) {
  const result = statements.reduce((accResult, curStmt) => {
    // console.log(`curStmt[${i}]=${JSON.stringify(curStmt, null, 2)}`);
    const curStMentorpalVals = statementMentorResponseValue(curStmt, [
      'answer_duration',
      'answer_text',
      'confidence',
      'mentor',
      'question_text',
      'question',
      'question_index',
    ]);
    return {
      answer_confidence:
        accResult.answer_confidence || curStMentorpalVals.confidence,
      // answer_duration:
      //   qsAcc.answer_duration || curStMentorpalVals.answer_duration,
      answer_text: accResult.answer_text || curStMentorpalVals.answer_text,
      mentor: accResult.mentor || curStMentorpalVals.mentor,
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
  // console.log(`sessionsById=${JSON.stringify(sessionsById, null, 2)}`);
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

          const sessQuesMentorResults = Object.getOwnPropertyNames(
            byMentor
          ).reduce((allMentors, curMentor) => {
            const curMentorResult = toQuesMentorResult(
              byMentor[curMentor],
              curSessId
            );
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

async function runReport({ since = '2019-07-31T00:00:00Z' } = {}) {
  const statements = await xapi.queryXapi({ since });
  const reportJson = statementsToReportJson(statements);
  return reportJson;
}

module.exports = {
  runReport,
  statementsToReportJson,
};
