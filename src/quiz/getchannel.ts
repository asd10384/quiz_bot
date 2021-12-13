import { I, M, PM } from "../aliases/discord.js.js";

export default function getchannel(message: M | PM) {
  if (message.guild?.me?.voice.channelId) return message.guild.me.voice.channel;
  if (message.member?.voice.channelId) return message.member?.voice.channel;
  return undefined;
}