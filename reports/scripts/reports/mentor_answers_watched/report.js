const xapi = require('./xapi');
const {
  groupStatementsByQuestionIndex,
  statementsToSessions,
  statementMentorResponseValue,
} = require('../../utils/xapi');
const jsonpath = require('jsonpath');

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
  // console.log(
  //   `sessionQuestionsBySessionId=${JSON.stringify(
  //     sessionQuestionsBySessionId,
  //     null,
  //     2
  //   )}`
  // );
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
              const curVals = statementMentorResponseValue(qsCur, [
                'answer_confidence',
                'answer_duration',
                'answer_text',
                'question_text',
              ]);
              return {
                answer_confidence: qsAcc.answer_confidence || curVals.answer_confidence,
                answer_duration: qsAcc.answer_duration || curVals.answer_duration,
                answer_text: qsAcc.answer_text || curVals.answer_text,
                question_index: i,
                question_text: qsAcc.question_text || curVals.question_text,
                session_id: sessionId,
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
