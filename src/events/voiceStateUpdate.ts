import { client } from "../index";
import { VoiceState } from "discord.js";

export const voiceStateUpdate = (oldState: VoiceState, newState: VoiceState) => {
  if (newState.member!.id === client.user!.id && !newState.channelId) {
    client.getqc(oldState.guild).stop();
  }
}
