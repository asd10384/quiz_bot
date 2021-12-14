import { client } from '..';
import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import MDB from "../database/Mongodb";
import quiz_start from '../quiz/start';

export default async function onmessageReactionAdd (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (user.bot) return;
  if (!reaction.message.guildId) return;

  let guildDB = await MDB.module.guild.findOne({ id: reaction.message.guildId });
  if (!guildDB) return console.log('reaction 데이터베이스 검색 실패');
  let quizDB = client.quizdb(reaction.message.guildId!);

  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  const name = reaction.emoji.name;
  if (!name) return;
  if (reaction.message.channelId === guildDB.channelId) {
    if (quizDB.page.player !== null && quizDB.page.player !== user.id) {
      reaction.message.channel.send({ embeds: [
        client.mkembed({
          title: `**퀴즈 오류**`,
          description: `<@${quizDB.page.player}>님이 먼저 사용하셨습니다.`,
          color: "DARK_RED"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return reaction.users.remove(user.id);
    }
    if (["⬅️", "➡️"].includes(name)) {
      quizDB.page.first = false;
      quizDB.page.now = (name === "⬅️") ? quizDB.page.now - 1 : quizDB.page.now + 1;
      if (quizDB.page.now < 0) quizDB.page.now = 0;
      if (quizDB.page.now > quizDB.page.maxpage) quizDB.page.now = quizDB.page.maxpage;
      client.quiz.set(reaction.message.guildId, quizDB);
      quiz_start(reaction.message);
    }
    if (["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"].includes(name)) {
      var number = smallnum(name);
      var pp = 0;
      if (quizDB.page.list[number-1] === "시작하기") {
        quizDB.page.go = true;
      }
      else if (quizDB.page.list[number-1] === "뒤로가기") {
        quizDB.page.go = false;
      } else {
        quizDB.page.go = null;
        pp = quizDB.page.now;
      }
      quizDB.page.first = false;
      if (quizDB.page.list.length >= (pp*5)+number) {
        quizDB.page.page.push(quizDB.page.list[(pp*5)+number-1]);
        client.quiz.set(reaction.message.guildId, quizDB);
        quiz_start(reaction.message);
      }
      client.quiz.set(reaction.message.guildId, quizDB);
    }
    if (name === "↩️") {
      quizDB.page.first = false;
      if (quizDB.page.go !== null) {
        quizDB.page.go = null;
      } else {
        quizDB.page.now = 0;
        quizDB.page.page.pop();
      }
      client.quiz.set(reaction.message.guildId, quizDB);
      quiz_start(reaction.message);
    }
    reaction.users.remove(user.id);
  }
}

function smallnum(s: string): number {
  return s === "1️⃣" ? 1
    : s === "2️⃣" ? 2
    : s === "3️⃣" ? 3
    : s === "4️⃣" ? 4
    : 5
}