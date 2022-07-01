// import request from "request";

// const MUSIC_SITE="";
// async function getsite(): Promise<any> {
//   return new Promise((res, rej) => {
//     request.get(`${MUSIC_SITE}/music_list.js`, (err, res2, body) => {
//       if (err || !body) return rej(err);
//       const data = eval(body)[0];
//       return res(data);
//     });
//   });
// }

// getsite().then((v) => {
//   console.log(Object.keys(v));
// });
