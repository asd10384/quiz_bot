import { VoiceState } from 'discord.js';
import { client } from '../index';

export const voiceStateUpdate = (oldStats: VoiceState, newStats: VoiceState) => {
  if (newStats.member!.id == client.user!.id && !newStats.channelId && oldStats.channel) {
    client.getqc(oldStats.guild).stop();
  }
}