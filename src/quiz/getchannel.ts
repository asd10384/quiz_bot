import { Guild, GuildMember } from "discord.js";

export const getuserchannel = (member: GuildMember | undefined) => {
  // if (message.guild?.me?.voice.channelId) return message.guild.me.voice.channel;
  if (member?.voice.channelId) return member.voice.channel;
  return undefined;
}
export const getbotchannel = async (guild: Guild) => {
  const bot = await guild.members.fetchMe({ cache: true });
  if (bot?.voice.channelId) return bot.voice.channel;
  // if (message.member?.voice.channelId) return message.member?.voice.channel;
  return undefined;
}