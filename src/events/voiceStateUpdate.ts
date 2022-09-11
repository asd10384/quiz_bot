import { client } from "../index";
import { ChannelType, VoiceState } from 'discord.js';

export default function voiceStateUpdate (oldStats: VoiceState, newStats: VoiceState) {
  if (newStats.member!.id === client.user!.id && !newStats.channelId) {
    client.getqc(oldStats.guild).stop(oldStats.guild);
  }
}
