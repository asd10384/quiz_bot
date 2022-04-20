import { Guild, GuildMember } from "discord.js";
import { I, M, PM } from "../aliases/discord.js.js";

export function getuserchannel(member: GuildMember | undefined) {
  // if (message.guild?.me?.voice.channelId) return message.guild.me.voice.channel;
  if (member?.voice.channelId) return member.voice.channel;
  return undefined;
}
export function getbotchannel(guild: Guild) {
  if (guild.me?.voice.channelId) return guild.me.voice.channel;
  // if (message.member?.voice.channelId) return message.member?.voice.channel;
  return undefined;
}