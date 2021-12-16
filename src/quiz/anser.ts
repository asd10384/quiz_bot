import { client } from "..";
import { M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";
import bulkmessage from "./bulkmessage";
import setmsg from "./msg";
import quiz from "./quiz";
import quiz_score from "./score";
import quiz_stop from "./stop";

export default async function quiz_anser(message: M | PM, args: string[], userId: string) {
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
    quizDB.score.set("skip", quizDB.score.get("skip") || 0 + 1);
  } else {
    quizDB.score.set(message.author!.id, quizDB.score.get(message.author!.id) || 0 + 1);
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