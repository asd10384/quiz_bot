import { client } from "..";
import { I, M, PM } from "../aliases/discord.js.js";
import request from "request";
import MDB from "../database/Mongodb";
import { config } from "dotenv";
import { TextChannel } from "discord.js";
import { QUIZ_RULE } from "../config";
import setquiz from "./setquiz";
import { page_data, page } from "./type";
config();
if (!process.env.MUSIC_SITE || process.env.MUSIC_SITE === "") throw "MUSIC_SITE를 찾을수 없습니다.";

export default async function quiz_start(message: M | PM, userId: string) {
  const guildDB = await MDB.get.guild(message);
  const quizDB = client.quizdb(message.guildId!);
  const music_list = `${process.env.MUSIC_SITE}/music_list.js`;
  request(music_list, async (err: any, res: any, body: string) => {
    const data: page = eval(body)[0];
    var list: string[] = [];
    var getkey: string[] = [];
    var getvalue: page_data | null = null;
    var channel = client.channels.cache.get(guildDB!.channelId) as TextChannel;
    var msg = channel.messages.cache.get(guildDB!.msgId);
    if (quizDB.page.first) {
      quizDB.page.player = message.member!.user.id;
      msg?.reactions.removeAll();
      msg?.react('⬅️');
      msg?.react('1️⃣');
      msg?.react('2️⃣');
      msg?.react('3️⃣');
      msg?.react('4️⃣');
      msg?.react('5️⃣');
      msg?.react('↩️');
      msg?.react('➡️');
    }
    if (quizDB.page.go !== null) {
      if (quizDB.page.go) {
        getvalue = data[quizDB.page.page[0]][quizDB.page.page[1]][quizDB.page.page[2]];
        quizDB.type = getvalue;
        msg?.reactions.removeAll();
        msg?.react("💡");
        msg?.react("⏭️");
        setquiz(message, getvalue, userId);
      } else {
        quizDB.page.go = null;
        quizDB.page.page.pop();
        quizDB.page.page.pop();
      }
    }
    switch (quizDB.page.page.length) {
      case 0:
        getkey = Object.keys(data);
        break;
      case 1:
        getkey = Object.keys(data[quizDB.page.page[0]]);
        break;
      case 2:
        getkey = Object.keys(data[quizDB.page.page[0]][quizDB.page.page[1]]);
        break;
      case 3:
        getkey = Object.keys(data[quizDB.page.page[0]][quizDB.page.page[1]][quizDB.page.page[2]]);
        getvalue = data[quizDB.page.page[0]][quizDB.page.page[1]][quizDB.page.page[2]];
        break;
    }
    const embed = client.mkembed({
      footer: { text: `아래 이모지가 다 생성된뒤 눌러주세요.` }
    });
    if (getvalue) {
      embed.setTitle(`**${quizDB.page.page.join("/") ? quizDB.page.page.join("/") : "퀴즈"}**`)
        .setDescription(`
          **이름**: ${quizDB.page.page[quizDB.page.page.length-1]}
          **형식**: ${getvalue.quiz}
          **설명**: ${getvalue.desc}
          **완성도**: ${(getvalue.complite === 100) ? "완성" : (getvalue.complite === 0) ? "미완성" : `${getvalue.complite}%`}
          
          1️⃣ 시작하기
          2️⃣ 뒤로가기
        `);
      quizDB.page.list = [ "시작하기", "뒤로가기" ];
    } else {
      getkey.forEach((key, i) => {
        if (!list[Math.floor(i / 5)]) list[Math.floor(i / 5)] = "";
        list[Math.floor(i / 5)] += `${bignum((i % 5)+1)}  ${key}\n`;
      });
      embed.setTitle(`**${quizDB.page.page.join("/") ? quizDB.page.page.join("/") : "퀴즈"}**`)
        .setDescription(`${list[quizDB.page.now]}\n**[** 페이지 **:** ${quizDB.page.now+1} **/** ${list.length} **]**`);
      quizDB.page.list = getkey;
      quizDB.page.maxpage = list.length - 1;
      if (quizDB.page.maxpage < 0) quizDB.page.maxpage = 0;
    }
    client.quiz.set(message.guildId!, quizDB);
    msg?.edit({
      content: `${QUIZ_RULE(guildDB!)}.`,
      embeds: [ embed ]
    });
  });
}

function bignum(n: number): string {
  return n === 1 ? "1️⃣"
    : n === 2 ? "2️⃣"
    : n === 3 ? "3️⃣"
    : n === 4 ? "4️⃣"
    : "5️⃣"
}