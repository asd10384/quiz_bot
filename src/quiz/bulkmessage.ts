import { TextChannel } from "discord.js";
import { I, M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";

export default async function bulkmessage(message: M | PM | I) {
  const guildDB = await MDB.get.guild(message);
  const channel = message.guild?.channels.cache.get(guildDB!.channelId) as TextChannel | undefined;
  if (!channel) return;
  channel.messages.fetch({ after: guildDB!.msgId }).then(async (ms) => {
    if (ms.size > 1) {
      channel.bulkDelete(ms.size-1).catch(() => {});
    }
  });
}