const express = require('express');
const fs = require('fs-extra');
const parse = require('csv-parse/lib/sync');
const router = express.Router();
// const request = require('async-request');

// // TODO checkVideoUrls out of app.js
// const checkVideoUrls = async () => {
//   const results = {
//     missing: [],
//   };

//   const filetypes = ['_M.mp4', '.mp4', '.ogv'];
//   const filesID = ['utterance_data.csv', 'classifier_data.csv'];
//   for (let k = 0; k < 2; k++) {
//     var mentorList = ['clint', 'dan', 'julianne', 'carlos'];
//     for (let j = 0; j < mentorList.length; j++) {
//       //console.log(mentorList[j]);
//       var x = fs.readFileSync(
//         'mentors/' + mentorList[j] + '/data/' + filesID[k]
//       );
//       let rows = parse(x, { columns: true, trim: false });
//       for (let i = 0; i < rows.length; i++) {
//         for (let l = 0; l < filetypes.length; l++) {
//           const videoURL = `https://pal3.ict.usc.edu/resources/mentor/${
//             mentorList[j]
//           }/${rows[i]['ID']}${filetypes[l]}`;

//           try {
//             let res = await request(videoURL, { method: 'HEAD' });
//             if (res.statusCode !== 200) {
//               results.missing.push(videoURL);
//               console.warn(
//                 `non-200 response to HEAD for ${videoURL}: ${res.statusCode}`
//               );
//             }
//           } catch (err) {
//             console.warn(
//               `error response to HEAD for ${videoURL} ${err.message}`
//             );
//             results.missing.push(videoURL);
//           }
//         }
//       }
//     }
//   }
// };

router.get('/videos', async (req, res, next) => {
  // result = await checkVideoUrls();
  // res.send(result);
  res.send({ 'feature-disabled': 'sorry' });
});

module.exports = router;
