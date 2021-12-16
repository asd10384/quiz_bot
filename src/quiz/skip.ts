import { client } from "..";
import { M, PM } from "../aliases/discord.js";
import quiz_anser from "./anser";
import { getbotchannel, getuserchannel } from "./getchannel";
import quiz_stop from "./stop";

const skip: Map<string, string[]> = new Map();
const can: Map<string, boolean> = new Map();

export async function quiz_skip(message: M | PM, userId: string) {
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
  if (!can.get(message.guildId!)) return;
  const maxmember = channel.members.size-1;
  if (skip.get(message.guildId!)?.includes(userId)) return message.channel.send({ embeds: [
    client.mkembed({
      title: `**\` 이미 투표하셨습니다. \`**`,
      color: "DARK_RED"
    })
  ] }).then(m => client.msgdelete(m, 1));
  var list = skip.get(message.guildId!) || [];
  list.push(userId);
  if (list.length >= Math.floor(maxmember / 2)) {
    reset_skip(message.guildId!, false);
    return quiz_anser(message, ["스킵"], userId);
  }
  skip.set(message.guildId!, list);
  return message.channel.send({ embeds: [
    client.mkembed({
      title: `스킵 투표: ${list.length}/${Math.floor(maxmember / 2)}`,
      description: `${Math.floor(maxmember / 2) - list.length}명 남았습니다.`
    })
  ] });
}

export function reset_skip(guildId: string, on: boolean) {
  skip.set(guildId, []);
  can.set(guildId, on);
}