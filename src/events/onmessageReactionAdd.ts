import { client } from '../index';
import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import MDB from "../database/Mongodb";

export default async function onmessageReactionAdd (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (user.bot) return;
  if (!reaction.message.guildId) return;

  let guildDB = await MDB.module.guild.findOne({ id: reaction.message.guildId });
  if (!guildDB) return console.log('reaction 데이터베이스 검색 실패');
  const qc = client.getqc(reaction.message.guild!);

  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  const name = reaction.emoji.name;
  if (!name) return;
  if (reaction.message.channelId === guildDB.channelId) {
    if (qc.playing) {
      if (name === "⏭️") {
        qc.quiz_skip(reaction.message, user.id);
      }
      if (name === "💡") {
        qc.quiz_hint(reaction.message, user.id);
      }
      return reaction.users.remove(user.id);
    }
    if (qc.page.player !== null && qc.page.player !== user.id) {
      reaction.message.channel.send({ embeds: [
        client.mkembed({
          title: `**퀴즈 오류**`,
          description: `<@${qc.page.player}>님이 먼저 사용하셨습니다.`,
          color: "DARK_RED"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return reaction.users.remove(user.id);
    }
    if (["⬅️", "➡️"].includes(name)) {
      qc.setpage({ first: false });
      let getnow = (name === "⬅️") ? qc.page.now - 1 : qc.page.now + 1;
      if (getnow < 0) {
        qc.setpage({ now: 0 });
      } else if (getnow > qc.page.maxpage) {
        qc.setpage({ now: qc.page.maxpage });
      } else {
        qc.setpage({ now: getnow });
      }
      qc.quiz_start(reaction.message, user.id);
    }
    if (["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"].includes(name)) {
      var number = smallnum(name);
      let pp = 0;
      if (qc.page.list[number-1] === "시작하기") {
        qc.setpage({ go: true });
      }
      else if (qc.page.list[number-1] === "뒤로가기") {
        qc.setpage({ go: false });
      } else {
        qc.setpage({ go: null });
        pp = qc.page.now;
      }
      qc.setpage({ first: false });
      if (qc.page.list.length >= (pp*5)+number) {
        let getpage = qc.page.page;
        getpage.push(qc.page.list[(pp*5)+number-1]);
        qc.setpage({ page: getpage });
        qc.quiz_start(reaction.message, user.id);
      }
    }
    if (name === "↩️") {
      qc.setpage({ first: false });
      if (qc.page.go !== null) {
        qc.setpage({ go: null });
        qc.page.go = null;
      } else {
        let getpage = qc.page.page;
        getpage.pop();
        qc.setpage({ now: 0 });
        qc.setpage({ page: getpage });
      }
      qc.quiz_start(reaction.message, user.id);
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