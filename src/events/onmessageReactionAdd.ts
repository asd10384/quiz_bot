import { QDB } from "../databases/Quickdb";
import { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { client } from "..";

const smallnum = (s: string): number => {
  return s == "1️⃣" ? 1
    : s == "2️⃣" ? 2
    : s == "3️⃣" ? 3
    : s == "4️⃣" ? 4
    : 5
}

export const onmessageReactionAdd = async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<any> => {
  if (user.bot) return;
  if (!reaction.message.guildId) return;

  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  const GDB = await QDB.guild.get(reaction.message.guild!);
  const qc = client.getqc(reaction.message.guild!);

  const name = reaction.emoji.name;
  if (!name) return;

  if (reaction.message.channelId == GDB.channelId) {
    if (qc.playing) {
      if (name == "⏭️") {
        qc.setSkip(reaction.message, user.id);
      }
      if (name == "💡") {
        qc.setHint(reaction.message, user.id);
      }
      return reaction.users.remove(user.id);
    }
    if (qc.page.userId != user.id) {
      reaction.message.channel.send({ embeds: [
        client.mkembed({
          title: `**퀴즈 오류**`,
          description: `<@${qc.page.userId}>님이 <@${user.id}>님보다 먼저 사용하셨습니다.`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return reaction.users.remove(user.id);
    }
    if (qc.cooldown+client.cooldowntime > Date.now()) {
      reaction.message.channel.send({ embeds: [
        client.mkembed({
          title: `**퀴즈 오류**`,
          description: `이모지를 너무 빨리 눌렀습니다.\n${((qc.cooldown+client.cooldowntime-Date.now())/1000).toFixed(2)}초 뒤에 사용해주세요.`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return reaction.users.remove(user.id);
    }
    qc.setcooldown(Date.now());
    if (["⬅️", "➡️"].includes(name)) {
      let getnowpage = qc.page.page;
      getnowpage = (name == "⬅️") ? getnowpage - 1 : getnowpage + 1;
      if (getnowpage < 0) {
        qc.setpage({ page: 0 });
      } else if (getnowpage > qc.page.maxpage) {
        qc.setpage({ page: qc.page.maxpage });
      } else {
        qc.setpage({ page: getnowpage });
      }
      qc.ready(reaction.message, user.id);
    } else if (["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"].includes(name)) {
      var number = smallnum(name);
      let pp = qc.page.page;
      if (qc.page.check) {
        if (number == 1) {
          qc.setpage({ go: true });
        } else if (number == 2) {
          qc.setpage({ name: null, page: 0, check: false, go: false });
        } else {
          qc.setpage({ go: false });
        }
      } else if (qc.page.list.length >= (pp*5)+number) {
        qc.setpage({ name: qc.page.list[(pp*5)+number-1], check: true });
      }
      qc.ready(reaction.message, user.id);
    } else if (name == "↩️") {
      qc.setpage({ page: 0, name: null, check: false, go: false });
      qc.ready(reaction.message, user.id);
    }
    reaction.users.remove(user.id);
  }
}