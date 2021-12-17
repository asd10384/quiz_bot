import ytdl from "ytdl-core";

ytdl.getInfo("https://youtu.be/zFoq37E_61o", {
  lang: "KR"
}).then((v) => console.log(v)).catch((e) => console.log("err"));