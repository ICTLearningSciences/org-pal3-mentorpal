require('dotenv').config();
const TinCan = require('tincanjs');

const queryStatements = require('./utils/xapi');

queryStatements({
  // verb: new TinCan.Verb({
  //   id: 'https://mentorpal.org/xapi/verb/asked',
  // }),
  activity: 'https://dev.pal3.org/xapi/resources/5d1bc549becb4e208dd0188b',
  since: '2019-07-31T00:00:00Z',
})
  .then(statements => {
    console.log(`RESULT=${JSON.stringify(statements, null, 2)}`);
  })
  .catch(err => {
    console.error(err);
  });

// user_id
// resource_id
// session_id
// question_number
// question_text
// mentor
// mentor_candidates
// answer_text
// answer_duration
// answer_confidence
// timestamp_asked
// timestamp_answer_received
// timestamp_playback_start
// timestamp_playback_end
// did_watch_to_end
