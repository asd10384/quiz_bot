import { client } from '../index';
import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import MDB from "../database/Mysql";

export default async function onmessageReactionAdd (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (user.bot) return;
  if (!reaction.message.guildId) return;

  const guildDB = await MDB.get.guild(reaction.message.guild!);
  if (!guildDB) {
    console.log('reaction 데이터베이스 검색 실패');
    return;
  }
  const qc = client.getqc(reaction.message.guild!);

  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  const name = reaction.emoji.name;
  if (!name) return;
  if (reaction.message.channelId === guildDB.channelId) {
    if (qc.playing) {
      if (name === "⏭️") {
        qc.skip(reaction.message, user.id);
      }
      if (name === "💡") {
        qc.hint(reaction.message, user.id);
      }
      return reaction.users.remove(user.id);
    }
    if (qc.page.start !== null && qc.page.start !== user.id) {
      reaction.message.channel.send({ embeds: [
        client.mkembed({
          title: `**퀴즈 오류**`,
          description: `<@${qc.page.start}>님이 먼저 사용하셨습니다.`,
          color: "DARK_RED"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return reaction.users.remove(user.id);
    }
    if (qc.cooldown+client.cooldowntime > Date.now()) {
      reaction.message.channel.send({ embeds: [
        client.mkembed({
          title: `**퀴즈 오류**`,
          description: `이모지를 너무 빨리 눌렀습니다.\n${((qc.cooldown+client.cooldowntime-Date.now())/1000).toFixed(2)}초 뒤에 사용해주세요.`,
          color: "DARK_RED"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return reaction.users.remove(user.id);
    }
    qc.setcooldown(Date.now());
    if (["⬅️", "➡️"].includes(name)) {
      let getnowpage = (name === "⬅️") ? qc.page.nowpage - 1 : qc.page.nowpage + 1;
      if (getnowpage < 0) {
        qc.setpage({ nowpage: 0 });
      } else if (getnowpage > qc.page.nownummax[1]) {
        qc.setpage({ nowpage: qc.page.nownummax[1] });
      } else {
        qc.setpage({ nowpage: getnowpage });
      }
      qc.start(reaction.message, user.id);
    } else if (["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"].includes(name)) {
      var number = smallnum(name);
      let pp = 0;
      if (qc.page.end) {
        if (number === 1) {
          qc.setpage({ go: true });
        } else if (number === 2) {
          qc.setpage({ go: false, end: false });
        } else {
          qc.setpage({ go: false });
          pp = qc.page.nowpage;
        }
      }
      if (qc.page.list.length >= (pp*5)+number) {
        let getpage = qc.page.page;
        getpage.push(qc.page.list[(pp*5)+number-1]);
        qc.setpage({ page: getpage });
        qc.start(reaction.message, user.id);
      }
    } else if (name === "↩️") {
      if (qc.page.go !== null) {
        qc.setpage({ end: false, go: false });
      } else {
        qc.setpage({ page: qc.page.page.slice(0,-1) });
        qc.setpage({ nowpage: 0 });
      }
      qc.start(reaction.message, user.id);
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