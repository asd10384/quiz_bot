import { ChannelType, Message } from "discord.js";
import { client, handler } from "..";
import { Logger } from "../utils/Logger";
import { QDB } from "../databases/Quickdb";

export const onMessageCreate = async (message: Message) => {
  if (message.author.bot || message.channel.type == ChannelType.DM) return;
  if (message.content.startsWith(client.prefix)) {
    const content = message.content.slice(client.prefix.length).trim();
    const args = content.split(/ +/g);
    const commandName = args.shift()?.toLowerCase();
    const command = handler.commands.get(commandName!) || handler.commands.find((cmd) => cmd.aliases.includes(commandName!));
    try {
      if (!command || !command.messageRun) return handler.err(message, commandName);
      command.messageRun(message, args);
    } catch(error) {
      if (client.debug) Logger.error(error as any); // 오류확인
      handler.err(message, commandName);
    } finally {
      client.msgdelete(message, 0, true);
    }
  } else {
    const GDB = await QDB.guild.get(message.guild!);
    if (GDB.channelId == message.channelId) {
      const qc = client.getqc(message.guild!);
      if (qc.playing) {
        const text = message.content.trim().replace(/ +/g, " ").toLowerCase();
        if (text == "스킵" || text == "skip") return qc.setSkip(message, message.author.id);
        if (text == "힌트" || text == "hint") return qc.setHint(message, message.author.id);
        if (text == qc.nowplaying?.name.toLowerCase() && qc.cananser) {
          qc.setcananser(false);
          return qc.anser([], message.author.id);
        }
      } else {
        // 쿨타임
        if (qc.cooldown+client.cooldowntime > Date.now()) {
          client.msgdelete(message, 100, true);
          return message.channel.send({ embeds: [ client.mkembed({
            title: `너무 빨리 입력했습니다.`,
            description: `${((qc.cooldown+client.cooldowntime-Date.now())/1000).toFixed(2)}초뒤,\n다시 시도해주세요.`,
            color: "DarkRed"
          }) ] }).then(m => client.msgdelete(m, 1));
        }
        qc.setcooldown(Date.now());
        const command = handler.commands.get("퀴즈");
        if (command && command.messageRun) return command.messageRun(message, message.content.trim().split(/ +/g));
      }
    }
  }
}