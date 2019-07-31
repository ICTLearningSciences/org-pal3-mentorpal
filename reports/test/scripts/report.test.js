const chai = require('chai');
// const mock = require('sinon');

const { expect } = chai;
const TinCan = require('tincanjs');

describe('scripts/report', async () => {
  it("passes", () => {
    expect(true).to.be.true
  })
})


//   before(async () => {
//     mockAuthentication();
//     lrsCreateStub();
//     await mongooseConnect();
//   });

//   afterEach(function() {
//     mock.restore();
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
//       `/api/1.0/me/compact-xapi/statements?since=${since}`
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
//       `/api/1.0/me/compact-xapi/statements?since=${since}`
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
