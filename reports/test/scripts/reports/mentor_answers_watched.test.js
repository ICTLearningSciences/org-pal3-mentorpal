const chai = require('chai');
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

  const mentor_candidates = 'm1,m2,m3,m4';
  const user_sessions = [
    {
      user_id: '5d3f924240631b0013f723dc',
      user_domain: 'https://dev.pal3.org/xapi/users',
      user_name: 'larry201907291740',
      resource_id:
        'https://dev.pal3.org/xapi/resources/5d1bc549becb4e208dd0188b',
      session_id: '57e21ad1-81cc-4746-9b31-25a26f2a377b',
    },
  ];

  describe('generates a rollup of mentor answers for one user/session', () => {
    const examples_one_user_session = [
      {
        xapi_data: exampleSessionsByUser['larry201907291740'],
        expected_result: [
          {
            ...user_sessions[0],
            answer_confidence: -0.5846809217592956,
            answer_text:
              "I have a lot of friends who are able to stay in active relationships even when they're deployed overseas.  So one of my friends for instance like a nice way that he gets to keep up with his girlfriend is that she sends him letters or like care packages that have like his favorite candy bars and food and like a nice note inside of it.  Sometimes she even flies out to where the ship docks, so like they just landed in Rota Spain and so she had a fun trip out to Spain to go see him.",
            mentor: 'julianne',
            question_index: 0,
            question_text: 'What makes a good leader?',
            resource_id:
              'https://dev.pal3.org/xapi/resources/5d1bc549becb4e208dd0188b',
          },
          {
            ...user_sessions[0],
            question_index: 0,
            question_text: 'What makes a good leader?',
            mentor: 'carlos',
            // mentor_candidates: mentor_candidates,
            answer_text:
              "The most important decisions I feel that I make throughout the day as a leader is the well being of my support, the team that we currently work with and their opportunities to continue to advance.  Some of our contracts end and then they have to either move on or we try to find other positions for them, and we're very successful in doing that, and you build relationships with your team, you wanna make sure of their well being not only professional but also personal.",
            answer_confidence: -0.6764202566510205,
            // timestamp_asked: 't1',
            // timestamp_answer_received: 't2',
            // timestamp_playback_start: 't3',
            // timestamp_playback_end: 't3',
            // did_watch_to_end: 1,
          },
          {
            ...user_sessions[0],
            answer_confidence: -0.41071530514281795,
            answer_text:
              "I had decades of experience in marine corps in the navy and industry and academia leadership has always been their primary topic of discussion and all those fields and there's always a lack of leadership is to cried and the presence of leadership leads to success so the question is what constitutes good leadership and that's almost impossible to answer the one inside I have had to use people are frequently the worst leaders when they try to emulate someone else's leadership style if you are a hard charger in the person who enjoys confrontation and forcing people to do their job that's one leadership style but if you're an easy going person who is Morrie leader who facilitates the people under him getting the job done and tries to motivate him to want to do it on their own that's a different kind leader if you look back at World War two and you know a thing about military history Omar Bradley and George Patton were two completely different leaders and they couldn't of been a leader in the morals of the other with because they just were not set up to do that yet they were wonderful leaders in their own right so find your own style while the people under you take care of the people who were in charge of you and you can't go far wrong",
            mentor: 'dan',
            question_index: 0,
            question_text: 'What makes a good leader?',
            resource_id:
              'https://dev.pal3.org/xapi/resources/5d1bc549becb4e208dd0188b',
            session_id: '57e21ad1-81cc-4746-9b31-25a26f2a377b',
            user_domain: 'https://dev.pal3.org/xapi/users',
            user_id: '5d3f924240631b0013f723dc',
            user_name: 'larry201907291740',
          },
          {
            ...user_sessions[0],
            answer_confidence: -0.7315148930800692,
            answer_text:
              "Some of the most important decisions that I've faced have to do with morality I would say. So here's what I mean. The most important thing that you can do in the military is follow directions, but not everybody does that, unfortunately, and your tasks as a supervisor is to confront these things and take care of them appropriately. So this is what I mean. Let's say that there is somebody on the ship, coming onto the ship any he's drunk and he's not supposed to be drunk. What do you do? So you could either grab him by the collar and take him to the local Master at Arms this person in trouble right, and that's the right thing to do. Another right thing to do would be to chastise him, to handle it in house to make sure that he doesn't do it again to kind of supervise and mentor him, if you think that he's that type of person so you don't have to necessarily ruin his career. So basically it's a morality question, the type of personality that you have and how willing to stick to the books you are to make sure that you do the right thing. When it comes to things that are going on in the plants, things that are going on in the engineering field there's no morality involved. If that thing is leaking you don't think hey you know like should I fix it or not, it's not that big. No if it's leaking, if X then Y. But when you're dealing with people, people with personalities, people with emotions, people with families, you have to really take all of that into consideration and to determine the wise thing to do, not necessarily the thing that's written in the book.",
            mentor: 'clint',
            question_index: 0,
            question_text: 'What makes a good leader?',
            resource_id:
              'https://dev.pal3.org/xapi/resources/5d1bc549becb4e208dd0188b',
          },
        ],
      },
    ];
    // for (let i = 0; i< examples_one_user_session.length; i++) {
    //   const ex = examples_one_user_session[i];
    const ex = examples_one_user_session[0];

    it(`generates a rollup of mentor answers for one user/session - example`, async () => {
      queryXapiStub.returns(Promise.resolve(ex.xapi_data));
      const result = await report.runReport();
      expect(queryXapiStub.callCount).to.eql(1);
      expect(result).to.eql(ex.expected_result);
    });
    // }
  });
});

//   before(async () => {
//     mockAuthentication();
//     lrsCreateStub();
//     await mongooseConnect();
//   });

//   it('should return an empty result when LRS /statements result is empty', async () => {
//     const mockQueryStatements = mock.stub();
//     mockQueryStatements.yieldsTo(
//       'callback',
//       null,
//       new TinCan.StatementsResult({
//         statements: [],
//         more: null,
//       })
//     );
//     mock.replace(TinCan.LRS.prototype, 'queryStatements', mockQueryStatements);
//     const since = '1970-01-01T00:00:00.000Z';
//     const response = await request(app).get(
// `/api/1.0/me/compact-xapi/statements?since=${since}`
//     );
//     expect(response.statusCode).to.equal(200);
//     expect(response.body).to.have.property('status', 'ok');
//     expect(response.body).to.have.deep.nested.property('statements', []);
//     expect(response.body).to.have.property('until', since);
//     // console.log(`result=${JSON.stringify(response.body)}`);
//   });

//   it('should return messages for cmi5 session where user fails the assingable unit', async () => {
//     const mockQueryStatements = mock.stub();
//     mockQueryStatements.yieldsTo(
//       'callback',
//       null,
//       new TinCan.StatementsResult({
//         statements: [
//           {
//             authority: {
//               objectType: 'Agent',
//               name: 'New Client',
//               mbox: 'mailto:hello@learninglocker.net',
//             },
//             stored: '2019-07-24T00:07:19.956Z',
//             context: {
//               registration: '5658ca51-6c2c-460c-8a10-237602f745ca',
//               contextActivities: {
//                 other: [
//                   {
//                     id:
//                       'http://id.tincanapi.com/activity/software/cmi5.js/2.0.1',
//                     objectType: 'Activity',
//                     definition: {
//                       type: 'http://id.tincanapi.com/activitytype/source',
//                       name: {
//                         und: 'cmi5.js (2.0.1)',
//                       },
//                       description: {
//                         en:
//                           'A JavaScript library implementing the cmi5 specification for AUs during runtime.',
//                       },
//                     },
//                   },
//                 ],
//                 category: [
//                   {
//                     id: 'https://w3id.org/xapi/cmi5/context/categories/cmi5',
//                     objectType: 'Activity',
//                   },
//                 ],
//               },
//             },
//             actor: {
//               objectType: 'Agent',
//               account: {
//                 name: '5c0ef7ccc3c4fa0010bc202f',
//                 homePage: 'https://dev.pal3.org/xapi/users',
//               },
//               name: 'aaaa',
//             },
//             timestamp: '2019-07-24T00:07:19.730Z',
//             version: '1.0.0',
//             id: 'e6353659-818c-4bab-8d8e-a3f5de2250d3',
//             verb: {
//               id: 'http://adlnet.gov/expapi/verbs/initialized',
//               display: {
//                 en: 'initialized',
//               },
//             },
//             object: {
//               id:
//                 'https://dev.pal3.org/xapi/resources/5cffef5ebecb4e208d44eb41',
//               objectType: 'Activity',
//             },
//           },
//           {
//             authority: {
//               objectType: 'Agent',
//               name: 'New Client',
//               mbox: 'mailto:hello@learninglocker.net',
//             },
//             stored: '2019-07-24T00:09:03.938Z',
//             context: {
//               registration: '5658ca51-6c2c-460c-8a10-237602f745ca',
//               contextActivities: {
//                 other: [
//                   {
//                     id:
//                       'http://id.tincanapi.com/activity/software/cmi5.js/2.0.1',
//                     objectType: 'Activity',
//                     definition: {
//                       type: 'http://id.tincanapi.com/activitytype/source',
//                       name: {
//                         und: 'cmi5.js (2.0.1)',
//                       },
//                       description: {
//                         en:
//                           'A JavaScript library implementing the cmi5 specification for AUs during runtime.',
//                       },
//                     },
//                   },
//                 ],
//                 category: [
//                   {
//                     id: 'https://w3id.org/xapi/cmi5/context/categories/cmi5',
//                     objectType: 'Activity',
//                   },
//                   {
//                     id: 'https://w3id.org/xapi/cmi5/context/categories/moveon',
//                     objectType: 'Activity',
//                   },
//                 ],
//               },
//             },
//             actor: {
//               objectType: 'Agent',
//               account: {
//                 name: '5c0ef7ccc3c4fa0010bc202f',
//                 homePage: 'https://dev.pal3.org/xapi/users',
//               },
//               name: 'aaaa',
//             },
//             timestamp: '2019-07-24T00:09:03.421Z',
//             version: '1.0.0',
//             id: '7e45d5bf-44b8-451e-aa4a-5c1064d69b8f',
//             result: {
//               success: false,
//               duration: 'PT1M42.07S',
//               extensions: {
//                 'https://pal3.org/xapi/vocab/exts/result/kc-scores': [
//                   {
//                     kc: 'inots-lisa-application',
//                     score: 0,
//                   },
//                 ],
//               },
//               score: {
//                 scaled: 0.2222222222222222,
//               },
//             },
//             verb: {
//               id: 'http://adlnet.gov/expapi/verbs/failed',
//               display: {
//                 und: 'failed',
//               },
//             },
//             object: {
//               id:
//                 'https://dev.pal3.org/xapi/resources/5cffef5ebecb4e208d44eb41',
//               objectType: 'Activity',
//             },
//           },
//           {
//             authority: {
//               objectType: 'Agent',
//               name: 'New Client',
//               mbox: 'mailto:hello@learninglocker.net',
//             },
//             stored: '2019-07-24T00:09:04.692Z',
//             context: {
//               registration: '5658ca51-6c2c-460c-8a10-237602f745ca',
//               contextActivities: {
//                 other: [
//                   {
//                     id:
//                       'http://id.tincanapi.com/activity/software/cmi5.js/2.0.1',
//                     objectType: 'Activity',
//                     definition: {
//                       type: 'http://id.tincanapi.com/activitytype/source',
//                       name: {
//                         und: 'cmi5.js (2.0.1)',
//                       },
//                       description: {
//                         en:
//                           'A JavaScript library implementing the cmi5 specification for AUs during runtime.',
//                       },
//                     },
//                   },
//                 ],
//                 category: [
//                   {
//                     id: 'https://w3id.org/xapi/cmi5/context/categories/cmi5',
//                     objectType: 'Activity',
//                   },
//                 ],
//               },
//             },
//             actor: {
//               objectType: 'Agent',
//               account: {
//                 name: '5c0ef7ccc3c4fa0010bc202f',
//                 homePage: 'https://dev.pal3.org/xapi/users',
//               },
//               name: 'aaaa',
//             },
//             timestamp: '2019-07-24T00:09:04.472Z',
//             version: '1.0.0',
//             id: '55f42780-222c-4b57-be8d-a27b5e9d0ca4',
//             result: {
//               duration: 'PT1M43.12S',
//             },
//             verb: {
//               id: 'http://adlnet.gov/expapi/verbs/terminated',
//               display: {
//                 en: 'terminated',
//               },
//             },
//             object: {
//               id:
//                 'https://dev.pal3.org/xapi/resources/5cffef5ebecb4e208d44eb41',
//               objectType: 'Activity',
//             },
//           },
//         ],
//         more: null,
//       })
//     );
//     mock.replace(TinCan.LRS.prototype, 'queryStatements', mockQueryStatements);
//     const since = '1970-01-01T00:00:00.000Z';
//     const response = await request(app).get(
// `/api/1.0/me/compact-xapi/statements?since=${since}`
//     );
//     // console.log(`result=${JSON.stringify(response.body, null, 2)}`);
//     expect(response.statusCode).to.equal(200);
//     expect(response.body).to.have.property('status', 'ok');
//     expect(response.body).to.have.property('until', '2019-07-24T00:09:04.692Z');
//     expect(response.body).to.have.deep.nested.property('statements', [
//       {
//         id: 'e6353659-818c-4bab-8d8e-a3f5de2250d3',
//         verb: 'in',
//         timestamp: '2019-07-24T00:07:19.730Z',
//         stored: '2019-07-24T00:07:19.956Z',
//         objId: '5cffef5ebecb4e208d44eb41',
//         objType: 'as',
//         sid: '5658ca51-6c2c-460c-8a10-237602f745ca',
//       },
//       {
//         id: '7e45d5bf-44b8-451e-aa4a-5c1064d69b8f',
//         verb: 'fa',
//         timestamp: '2019-07-24T00:09:03.421Z',
//         stored: '2019-07-24T00:09:03.938Z',
//         result: {
//           score: 0.2222222222222222,
//           duration: 102.07,
//           extensions: {
//             'https://pal3.org/xapi/vocab/exts/result/kc-scores': [
//               {
//                 kc: 'inots-lisa-application',
//                 score: 0,
//               },
//             ],
//           },
//         },
//         objId: '5cffef5ebecb4e208d44eb41',
//         objType: 'as',
//         sid: '5658ca51-6c2c-460c-8a10-237602f745ca',
//       },
//       {
//         id: '55f42780-222c-4b57-be8d-a27b5e9d0ca4',
//         verb: 'tm',
//         timestamp: '2019-07-24T00:09:04.472Z',
//         stored: '2019-07-24T00:09:04.692Z',
//         result: {
//           duration: 103.12,
//         },
//         objId: '5cffef5ebecb4e208d44eb41',
//         objType: 'as',
//         sid: '5658ca51-6c2c-460c-8a10-237602f745ca',
//       },
//     ]);
//   });

//   after(async () => {
//     await mongoose.disconnect();
//   });
// });
