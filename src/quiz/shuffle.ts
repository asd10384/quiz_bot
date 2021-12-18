import { client } from "../index";
import { PM, M } from "../aliases/discord.js.js"
import setmsg from "./msg";

export async function shuffle(message: M | PM) {
  let quizDB = client.quizdb(message.guildId!);
  quizDB.queue = fshuffle(quizDB.queue);
  client.quiz.set(message.guildId!, quizDB);
  setmsg(message);
}

export function fshuffle(list: any[]) {
  var j, x, i;
  for (i=list.length; i; i-=1) {
    j = Math.floor(Math.random() * i);
    x = list[i-1];
    list[i-1] = list[j];
    list[j] = x;
  }
  return list;
}