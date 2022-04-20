import { client, handler } from '../index';
import { Message } from 'discord.js';
import MDB from "../database/Mongodb";

export default async function onMessageCreate (message: Message) {
  if (message.author.bot || message.channel.type === 'DM') return;
  if (message.content.startsWith(client.prefix)) {
    const content = message.content.slice(client.prefix.length).trim();
    const args = content.split(/ +/g);
    const commandName = args.shift()?.toLowerCase();
    const command = handler.commands.get(commandName!) || handler.commands.find((cmd) => cmd.aliases.includes(commandName!));
    try {
      if (!command || !command.msgrun) return handler.err(message, commandName);
      command.msgrun(message, args);
    } catch(error) {
      if (client.debug) console.log(error); // 오류확인
      handler.err(message, commandName);
    } finally {
      client.msgdelete(message, 100, true);
    }
  } else {
    return MDB.get.guild(message.guild!).then((guildID) => {
      if (guildID!.channelId === message.channelId) {
        const qc = client.getqc(message.guild!);
        if (qc.playing) {
          const text = message.content.trim().replace(/ +/g, " ").toLowerCase();
          if (text === "스킵" || text === "skip") return qc.quiz_skip(message, message.author.id);
          if (text === "힌트" || text === "hint") return qc.quiz_hint(message, message.author.id);
          if (text === qc.nowplaying?.name.toLowerCase() && !qc.quizanser) {
            qc.setquizanser(true);
            return qc.quiz_anser(message, [], message.author.id);
          }
        } else {
          client.msgdelete(message, 100, true);
          const command = handler.commands.get("퀴즈");
          if (command && command.msgrun) return command.msgrun(message, message.content.trim().split(/ +/g));
        }
      }
    });
  }
}