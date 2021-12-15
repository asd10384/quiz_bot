import { client } from "..";
import { M, PM } from "../aliases/discord.js";
import { getbotchannel, getuserchannel } from "./getchannel";
import { fshuffle } from "./shuffle";
import quiz_stop from "./stop";

const hint: Map<string, string[]> = new Map();
const can: Map<string, boolean> = new Map();

export async function quiz_hint(message: M | PM, userId: string) {
  if (!can.get(message.guildId!)) return;
  var channel = getbotchannel(message);
  if (!channel) return quiz_stop(message);
  var userchannel = getuserchannel(message.guild?.members.cache.get(userId));
  if (channel.id !== userchannel?.id) return message.channel.send({ embeds: [
    client.mkembed({
      title: `**음성채널 오류**`,
      description: `봇이 있는 음성채널에 들어간뒤 사용해주세요.`,
      color: "DARK_RED"
    })
  ] }).then(m => client.msgdelete(m, 1));
  const maxmember = channel.members.size-1;
  if (hint.get(message.guildId!)?.includes(userId)) return message.channel.send({ embeds: [
    client.mkembed({
      title: `**\` 이미 투표하셨습니다. \`**`,
      color: "DARK_RED"
    })
  ] }).then(m => client.msgdelete(m, 1));
  var list = hint.get(message.guildId!) || [];
  list.push(userId);
  if (list.length > Math.floor(maxmember / 2)) {
    reset_hint(message.guildId!, false);
    const quizDB = client.quizdb(message.guildId!);
    var name = quizDB.nowplaying?.name;
    if (!name) return;
    var ilist: number[] = [];
    for (let i=0; i<name.length; i++) {
      if (/[~!@#$%^&*()_+|<>?:{}]/g.test(name[i])) continue;
      if (/\s/g.test(name[i])) continue;
      ilist.push(i);
    }
    ilist = fshuffle(ilist);
    var blist = ilist.slice(0, Math.floor(ilist.length / 2));
    var text = "";
    for (let i=0; i<name.length; i++) {
      if (blist.includes(i)) text += `◻️`;
      text += name[i];
    }
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `**\` 힌트 \`**`,
        description: text
      })
    ] });
  }
  hint.set(message.guildId!, list);
  return message.channel.send({ embeds: [
    client.mkembed({
      title: `힌트 투표: ${list.length}/${Math.floor(maxmember / 2)}`,
      description: `${Math.floor(maxmember / 2) - list.length}명 남았습니다.`
    })
  ] });
}

export function reset_hint(guildId: string, on: boolean) {
  hint.set(guildId, []);
  can.set(guildId, on);
}