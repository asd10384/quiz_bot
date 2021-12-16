import { client } from "..";
import { M, PM, I } from "../aliases/discord.js";
import { guild_type } from "../database/obj/guild";
import MDB from "../database/Mongodb";
import { MessageEmbed, TextChannel } from "discord.js";
import { QUIZ_RULE } from "../config";

export default async function setmsg(message: M | PM | I, anser_user?: string, time?: number) {
  MDB.module.guild.findOne({ id: message.guildId! }).then((guildDB) => {
    if (guildDB) {
      let text = `${setlist(guildDB)}`;
      let embed = setembed(guildDB, anser_user, time);
      let channel = message.guild?.channels.cache.get(guildDB.channelId);
      (channel as TextChannel).messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] });
    }
  });
}

function setlist(guildDB: guild_type): string {
  let quizDB = client.quizdb(guildDB.id);
  if (quizDB.playing) {
    return `퀴즈를 종료하시려면 \` ${client.prefix}퀴즈 종료 \`를 입력해주세요.
퀴즈가 진행되지 않거나 오류가 발생했을때 \` ${client.prefix}퀴즈 fix 를 입력해주세요.
힌트를 받으시려면 \`힌트 \`를 입력하거나 💡를 눌러주세요.
문제를 스킵하시려면 \` 스킵 \`을 입력하거나 ⏭️을 눌러주세요.\n.`;
  } else {
    return `${QUIZ_RULE(guildDB)}.`;
  }
}

function setembed(guildDB: guild_type, anser_user?: string, time?: number): MessageEmbed {
  let quizDB = client.quizdb(guildDB.id);
  let data = quizDB.nowplaying!;
  let embed = client.mkembed({
    footer: { text: `${client.prefix}퀴즈 도움말` }
  });
  if (quizDB.playing) {
    if (quizDB.anser) {
      return embed.setTitle(`**정답 : ${data.name}**`)
        .setURL(data.link)
        .setDescription(`
          **가수 : ${data.vocal}**
          **정답자 : ${anser_user ? anser_user : `<@${quizDB.anser}>`}**
          **[ ${quizDB.count[0]-1} / ${quizDB.count[1]} ]**
        `)
        .setImage(quizDB.image)
        .setFooter(`${time ? time : 15}초 뒤에 다음문제로 넘어갑니다.`);
    } else {
      return embed.setTitle(`**정답 : ???**`)
        .setDescription(`
          **가수 : ???**
          **정답자 : ???**
          **[ ${quizDB.count[0]} / ${quizDB.count[1]} ]**
        `)
        .setImage(`https://ytms.netlify.app/question_mark.png`);
    }
  } else {
    return embed.setTitle(`**현재 퀴즈가 시작되지 않았습니다.**`)
      .setDescription(`**정답설정 : ${guildDB.options.anser}**\n**다음문제시간 : ${guildDB.options.nexttime}초**`)
      .setImage(`https://ytms.netlify.app/defult.png`);
  }
  return embed;
}