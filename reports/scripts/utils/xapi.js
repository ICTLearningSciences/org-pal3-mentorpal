require('dotenv').config();
const jsonpath = require('jsonpath');
const TinCan = require('tincanjs');

function requireEnv(name) {
  const val = process.env[name];
  if (val) {
    return val;
  }
  throw new Error(
    `required env variable '${name}' is not defined. Make sure .env file exists in root and has ${name} set`
  );
}
// TinCan.DEBUG = true;

const lrs = new TinCan.LRS({
  endpoint: requireEnv('XAPI_ENDPOINT'),
  username: requireEnv('XAPI_USERNAME'),
  password: requireEnv('XAPI_PASSWORD'),
  allowFail: false,
});

function statementsToSessions(statements) {
  return statements.reduce((acc, cur) => {
    const sid = jsonpath.value(cur, '$..context.registration');
    acc[sid] = Array.isArray(acc[sid]) ? acc[sid] : [];
    acc[sid].push(cur);
    return acc;
  }, {});
}

function groupStatementsByQuestionIndex(statements) {
  return statements.reduce((sqAcc, sqCur) => {
    const qix = Number(
      jsonpath.value(sqCur, '$..context.extensions..question_index')
    );
    // console.log('questionix=' + qix);
    if (isNaN(qix)) {
      return sqAcc;
    }
    sqAcc[qix] = Array.isArray(sqAcc[qix]) ? sqAcc[qix] : [];
    sqAcc[qix].push(sqCur);
    return sqAcc;
  }, []);
}

function statementMentorResponseValue(statement, propertyOrProps) {
  const mpresponse = 'mentorpal_response';
  const st = JSON.parse(
    JSON.stringify(statement).replace(
      'https://mentorpal.org/xapi/activity/extensions/mentor-response',
      mpresponse
    )
  );
  if (typeof propertyOrProps === 'string') {
    return jsonpath.value(st, `$..${mpresponse}.${property}`);
  }
  if (!Array.isArray(propertyOrProps)) {
    throw new Error(
      'statementMentorResponseValue arg propertyOrProps must be string or array'
    );
  }
  const responseObjArr = jsonpath.query(st, `$..${mpresponse}`);
  if (!Array.isArray(responseObjArr) || responseObjArr.length === 0) {
    return {};
  }
  const responseObj = responseObjArr[0];
  return propertyOrProps.reduce((acc, cur) => {
    return {
      ...acc,
      [cur]: responseObj[cur],
    };
  }, {});
}

function _statementMentorResponseValue(statement, property) {}

function getQuestionText(statement) {
  return statementMentorResponseValue(statement, 'question_text');
}

function getObjectId(statement) {
  return jsonpath.value(statement, '$.object.id')
}

function queryStatements(params) {
  return new Promise((resolve, reject) => {
    lrs.queryStatements({
      params: params,
      callback: function(err, sr) {
        if (err) {
          console.error(err);
          return reject(err);
        }

        if (sr.more !== null) {
          // TODO: additional page(s) of statements should be fetched
        }

        if (!Array.isArray(sr.statements) || sr.statements.length == 0) {
          return resolve([]);
        }

        return resolve(sr.statements.map(s => s.asVersion()));
      },
    });
  });
}

module.exports = {
  getObjectId,
  getQuestionText,
  groupStatementsByQuestionIndex,
  queryStatements,
  statementMentorResponseValue,
  statementsToSessions,
};
