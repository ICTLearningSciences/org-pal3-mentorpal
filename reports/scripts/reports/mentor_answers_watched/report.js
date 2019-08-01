const xapi = require('./xapi');
const {
  getObjectId,
  getUserDomain,
  getUserId,
  getUserName,
  groupStatementsByQuestionIndex,
  statementsToSessions,
  statementMentorResponseValue,
} = require('../../utils/xapi');

async function runReport({ since = '2019-07-31T00:00:00Z' } = {}) {
  const statements = await xapi.queryXapi({ since });
  const sessionsById = statementsToSessions(statements);
  // console.log(`sessionsById=${JSON.stringify(sessionsById, null, 2)}`);
  const sessionQuestionsBySessionId = Object.getOwnPropertyNames(
    sessionsById
  ).reduce((acc, cur) => {
    acc[cur] = groupStatementsByQuestionIndex(sessionsById[cur]);
    return acc;
  }, {});
  const result = Object.getOwnPropertyNames(sessionQuestionsBySessionId).reduce(
    (acc, sessionId) => {
      const questions = sessionQuestionsBySessionId[sessionId];
      const sessionStatments = questions.reduce(
        (ssAcc, questionStatements, i) => {
          if (
            !Array.isArray(questionStatements) ||
            questionStatements.length == 0
          ) {
            return ssAcc;
          }
          const sessionQuestionStatements = questionStatements.reduce(
            (qsAcc, qsCur) => {
              console.log(`qsCur[${i}]=${JSON.stringify(qsCur, null, 2)}`);
              qsAcc = qsAcc || {};
              const curStMentorpalVals = statementMentorResponseValue(qsCur, [
                'answer_duration',
                'answer_text',
                'confidence',
                'mentor',
                'question_text',
              ]);
              return {
                answer_confidence:
                  qsAcc.answer_confidence || curStMentorpalVals.confidence,
                // answer_duration:
                //   qsAcc.answer_duration || curStMentorpalVals.answer_duration,
                answer_text:
                  qsAcc.answer_text || curStMentorpalVals.answer_text,
                mentor: qsAcc.mentor || curStMentorpalVals.mentor,
                question_index: i,
                question_text:
                  qsAcc.question_text || curStMentorpalVals.question_text,
                resource_id: qsAcc.resource_id || getObjectId(qsCur),
                session_id: sessionId,
                user_domain: qsAcc.user_domain || getUserDomain(qsCur),
                user_id: qsAcc.user_id || getUserId(qsCur),
                user_name: qsAcc.user_name || getUserName(qsCur),
              };
            }
          );

          return [...ssAcc, sessionQuestionStatements];
        },
        []
      );
      return [...acc, sessionStatments];
    },
    []
  );
  return result;
}

module.exports = {
  runReport,
};
