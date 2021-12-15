import { TextChannel } from "discord.js";
import { client } from "..";
import { M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";
import quiz from "./quiz";
import quiz_score from "./score";
import quiz_stop from "./stop";

export default async function quiz_anser(message: M | PM, args: string[], userId: string) {
  const guildDB = await MDB.get.guild(message);
  const quizDB = client.quizdb(message.guildId!);
  var anser_user = `<@${userId}>`;
  if (args[0] === "스킵" || args[0] === "skip") {
    anser_user = (args[1] == '시간초과') 
      ? '시간초과로 스킵되었습니다.' 
      : (args[1] == '관리자') 
      ? `<@${userId}> 님이 강제로 스킵했습니다.`
      : '스킵하셨습니다.';
    quizDB.score.set("skip", quizDB.score.get("skip") || 0 + 1);
  } else {
    quizDB.score.set(message.author!.id, quizDB.score.get(message.author!.id) || 0 + 1);
  }
  quiz_score(message);
  const channel = message.guild?.channels.cache.get(guildDB!.channelId) as TextChannel;
  const msg = channel.messages.cache.get(guildDB!.msgId);
  const time = guildDB!.options.nexttime;
  msg?.edit({ embeds: [
    client.mkembed({
      title: `**정답 : ${quizDB.nowplaying?.name}**`,
      description: `
        **가수 : ${quizDB.nowplaying?.vocal}**
        **정답자 : <@${userId}>**
        **문제 : ${quizDB.count[0]} / ${quizDB.count[1]}**
      `,
      footer: { text: `${time}초 뒤에 다음문제로 넘어갑니다.` }
    })
  ] });
  quizDB.count[0] = quizDB.count[0] + 1;
  client.quiz.set(message.guildId!, quizDB);
  setTimeout(() => {
    try {
      quiz(message, userId);
    } catch {
      quiz_stop(message);
    }
  }, time * 1000);
}