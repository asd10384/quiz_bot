import { client } from "..";
import { M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";
import bulkmessage from "./bulkmessage";
import { reset_hint } from "./hint";
import setmsg from "./msg";
import quiz from "./quiz";
import quiz_score from "./score";
import { reset_skip } from "./skip";
import quiz_stop from "./stop";

export default async function quiz_anser(message: M | PM, args: string[], userId: string) {
  reset_skip(message.guildId!, false);
  reset_hint(message.guildId!, false);
  const guildDB = await MDB.get.guild(message);
  const quizDB = client.quizdb(message.guildId!);
  var anser_user = `<@${userId}>`;
  if (args[0] === "스킵" || args[0] === "skip") {
    anser_user = (args[1] === '시간초과') 
      ? '시간초과로 스킵되었습니다.' 
      : (args[1] === '관리자') 
      ? `<@${userId}> 님이 강제로 스킵했습니다.`
      : (args[1] === "오류")
      ? `노래오류로 스킵되었습니다.`
      : '스킵하셨습니다.';
    var skipnum = quizDB.score.get("skip");
    if (!skipnum) skipnum = 0;
    quizDB.score.set("skip", skipnum + 1);
  } else {
    var scorenum = quizDB.score.get(message.author!.id);
    if (!scorenum) scorenum = 0;
    quizDB.score.set(message.author!.id, scorenum + 1);
  }
  quiz_score(message);
  quizDB.count[0] = quizDB.count[0] + 1;
  quizDB.anser = userId;
  client.quiz.set(message.guildId!, quizDB);
  const time = guildDB!.options.nexttime;
  bulkmessage(message);
  setmsg(message, anser_user, time);
  setTimeout(() => {
    try {
      quiz(message, userId);
    } catch {
      quiz_stop(message);
    }
  }, time * 1000);
}