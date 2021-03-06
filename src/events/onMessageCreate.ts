import { client, handler } from '../index';
import { Message } from 'discord.js';
import MDB from "../database/Mysql";

export default async function onMessageCreate (message: Message) {
  if (message.author.bot || message.channel.type === 'DM') return;
  if (message.content.startsWith(client.prefix)) {
    const content = message.content.slice(client.prefix.length).trim();
    const args = content.split(/ +/g);
    const commandName = args.shift()?.toLowerCase();
    const command = handler.commands.get(commandName!) || handler.commands.find((cmd) => cmd.aliases.includes(commandName!));
    
    const qc = client.getqc(message.guild!);
    if (qc.cooldown+client.cooldowntime > Date.now()) return message.channel.send({ embeds: [ client.mkembed({
      title: `너무 빨리 입력했습니다.`,
      description: `${((qc.cooldown+client.cooldowntime-Date.now())/1000).toFixed(2)}초뒤,\n다시 시도해주세요.`,
      color: "DARK_RED"
    }) ] }).then(m => client.msgdelete(m, 1));
    qc.setcooldown(Date.now());
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
          if (text === "스킵" || text === "skip") return qc.skip(message, message.author.id);
          if (text === "힌트" || text === "hint") return qc.hint(message, message.author.id);
          if (text === qc.nowplaying?.name.toLowerCase() && !qc.cananser) {
            qc.setcananser(true);
            if (qc.playquiztype.quiz === "음악퀴즈") return qc.music_anser(message, [], message.author.id);
            // if (qc.playquiztype.quiz === "그림퀴즈") return qc.img_anser(message, [], message.author.id);
            return qc.stop(message.guild!);
          }
        } else {
          // 쿨타임
          if (qc.cooldown+client.cooldowntime > Date.now()) return message.channel.send({ embeds: [ client.mkembed({
            title: `너무 빨리 입력했습니다.`,
            description: `${((qc.cooldown+client.cooldowntime-Date.now())/1000).toFixed(2)}초뒤,\n다시 시도해주세요.`,
            color: "DARK_RED"
          }) ] }).then(m => client.msgdelete(m, 1));
          qc.setcooldown(Date.now());
          client.msgdelete(message, 100, true);
          const command = handler.commands.get("퀴즈");
          if (command && command.msgrun) return command.msgrun(message, message.content.trim().split(/ +/g));
        }
      }
    });
  }
}