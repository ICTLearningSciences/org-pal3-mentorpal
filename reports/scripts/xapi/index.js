const jsonpath = require("jsonpath");
const TinCan = require("tincanjs");

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

let _lrs;
const lrs = () => {
  if (_lrs instanceof TinCan.LRS) {
    return _lrs;
  }
  // normally require `dotenv` as early as possible,
  // but here we want to support test envs
  // that mock the LRS server and have no credentials
  require("dotenv").config();
  _lrs = new TinCan.LRS({
    endpoint: requireEnv("XAPI_ENDPOINT"),
    username: requireEnv("XAPI_USERNAME"),
    password: requireEnv("XAPI_PASSWORD"),
    allowFail: false,
  });
  return _lrs;
};

function statementsToSessions(statements) {
  return statements.reduce((acc, cur) => {
    const sid = jsonpath.value(cur, "$..context.registration");
    acc[sid] = Array.isArray(acc[sid]) ? acc[sid] : [];
    acc[sid].push(cur);
    return acc;
  }, {});
}

function groupStatementsByQuestionIndex(statements) {
  return statements.reduce((sqAcc, sqCur) => {
    const qix = Number(
      jsonpath.value(sqCur, "$..context.extensions..question_index")
    );
    if (isNaN(qix)) {
      return sqAcc;
    }
    sqAcc[qix] = Array.isArray(sqAcc[qix]) ? sqAcc[qix] : [];
    sqAcc[qix].push(sqCur);
    return sqAcc;
  }, []);
}

function groupStatementsByMentor(statements) {
  return statements.reduce((acc, cur) => {
    const mentor = jsonpath.value(cur, "$..result.extensions..mentor");
    if (!mentor) {
      return acc;
    }
    acc[mentor] = Array.isArray(acc[mentor]) ? acc[mentor] : [];
    acc[mentor].push(cur);
    return acc;
  }, {});
}

function _statementExtValues(statement, extProp, propertyOrProps) {
  // we won't be able to use jsonpath to search for XAPI IRI props,
  // which are urls, so we need to repalce the prop first
  const extPropReplacement = "___ext_prop_replacement___";
  const st = JSON.parse(
    JSON.stringify(statement).replace(extProp, extPropReplacement)
  );
  if (typeof propertyOrProps === "string") {
    return jsonpath.value(st, `$..${extPropReplacement}.${property}`);
  }
  if (!Array.isArray(propertyOrProps)) {
    throw new Error("arg propertyOrProps must be string or array");
  }
  const responseObjArr = jsonpath.query(st, `$..${extPropReplacement}`);
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

function statementResultExtValues(statement, propertyOrProps) {
  return _statementExtValues(
    statement,
    "https://mentorpal.org/xapi/activity/extensions/mentor-response",
    propertyOrProps
  );
}

function statementContextMentorValues(statement, propertyOrProps) {
  return _statementExtValues(
    statement,
    "https://mentorpal.org/xapi/context/extensions/session-state",
    propertyOrProps
  );
}

function statementExtValues(statement, { context, result } = {}) {
  const contextVals = context
    ? statementContextMentorValues(statement, context)
    : {};
  const resultVals = result ? statementResultExtValues(statement, result) : {};
  return {
    ...contextVals,
    ...resultVals,
  };
}

function timestampOfStatementWithVerb(statementList, verb, ord = 1) {
  const list = statementList.filter(
    s => jsonpath.value(s, "$.verb.id") === verb
  );
  if (!Array.isArray(list) || list.length < 1) {
    return undefined;
  }
  const st = list.sort((a, b) =>
    a.timestamp > b.timestamp ? 1 * ord : -1 * ord
  )[0];
  return st.timestamp;
}

function timestampAsked(statementList, ord = 1) {
  return timestampOfStatementWithVerb(
    statementList,
    "https://mentorpal.org/xapi/verb/asked",
    ord
  );
}

function timestampAnswered(statementList, ord = 1) {
  return timestampOfStatementWithVerb(
    statementList,
    "https://mentorpal.org/xapi/verb/answered",
    ord
  );
}

function timestampAnswerPlaybackEnded(statementList, ord = 1) {
  return timestampOfStatementWithVerb(
    statementList,
    'https://mentorpal.org/xapi/verb/answer-playback-ended',
    ord
  );
}

function timestampAnswerPlaybackStarted(statementList, ord = 1) {
  return timestampOfStatementWithVerb(
    statementList,
    'https://mentorpal.org/xapi/verb/answer-playback-started',
    ord
  );
}

function getQuestionText(statement) {
  return statementResultExtValues(statement, "question_text");
}

function getObjectId(statement) {
  return jsonpath.value(statement, "$.object.id");
}

function getUserDomain(statement) {
  return jsonpath.value(statement, "$.actor.account.homePage");
}

function getUserId(statement) {
  return jsonpath.value(statement, "$.actor.account.name");
}

function getUserName(statement) {
  return jsonpath.value(statement, "$.actor.name");
}

function queryStatements(params) {
  return new Promise((resolve, reject) => {
    lrs().queryStatements({
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
  getUserDomain,
  getUserId,
  getUserName,
  groupStatementsByQuestionIndex,
  groupStatementsByMentor,
  queryStatements,
  statementContextMentorValues,
  statementExtValues,
  statementResultExtValues,
  statementsToSessions,
  timestampOfStatementWithVerb,
  timestampAnswered,
  timestampAsked,
  timestampAnswerPlaybackEnded,
  timestampAnswerPlaybackStarted,
};
