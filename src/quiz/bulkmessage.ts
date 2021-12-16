import { TextChannel } from "discord.js";
import { I, M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";

export default async function bulkmessage(message: M | PM | I, time?: number) {
  const guildDB = await MDB.get.guild(message);
  const channel = message.guild?.channels.cache.get(guildDB!.channelId) as TextChannel | undefined;
  if (!channel) return;
  setTimeout(() => {
    channel.messages.fetch({ after: guildDB!.msgId }).then(ms => {
      if (ms.size > 0) {
        try {
          channel.bulkDelete(ms.size).catch(() => {});
        } catch {}
      }
    });
  }, time ? time : 100);
}