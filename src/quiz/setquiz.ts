import { load } from "cheerio";
import { client } from "..";
import request from "request";
import { fshuffle } from "./shuffle";
import { page_data } from "./type";
import { M, PM } from "../aliases/discord.js";
import quiz from "./quiz";

type htmllist = { name: string, vocal: string, link: string; }[];

export default async function setquiz(message: M | PM, getvalue: page_data, userId: string) {
  request(getvalue.url.toLowerCase().replace(/ㄱ-ㅎ|ㅏ-ㅣ|가-힣|\s/g, encodeURIComponent), async (err, res, html) => {
    const $ = load(html);
    var first: htmllist = [];
    $("body div.music div").each((i, el) => {
      first.push({
        name: ($(el).children("a.name").text().trim()),
        vocal: ($(el).children("a.vocal").text().trim()),
        link: ($(el).children("a.link").text().trim())
      });
    });
    var second: htmllist = [];
    var count: number[] = [];
    count = Array.from(Array(first.length).keys());
    for (let i=0; i<3; i++) count = fshuffle(count);
    const maxcount = 100;
    var logtext = "";
    for (let i=0; i<maxcount; i++) {
      if (!first[count[i]]?.name) continue;
      second.push({
        name: first[count[i]]!.name,
        vocal: first[count[i]]!.vocal,
        link: first[count[i]]!.link
      });
      logtext += `${i+1}. [${count[i]}] ${first[count[i]].vocal} - ${first[count[i]].name}\n`;
    }
    if (client.debug) console.log(logtext);
    const quizDB = client.quizdb(message.guildId!);
    quizDB.queue = second;
    quizDB.count = [ 1, second.length ];
    client.quiz.set(message.guildId!, quizDB);
    quiz(message, userId);
  });
}