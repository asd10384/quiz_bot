import { client } from "../index";
import { M, PM, I } from "../aliases/discord.js.js";
import { guild_type, nowplay } from "../database/obj/guild";
import MDB from "../database/Mongodb";
import { MessageEmbed, TextChannel } from "discord.js";

export default async function quiz_score(message: M | PM | I) {
  MDB.module.guild.findOne({ id: message.guildId! }).then((guildDB) => {
    if (guildDB) {
      let embed = setembed(guildDB);
      let channel = message.guild?.channels.cache.get(guildDB.channelId);
      (channel as TextChannel).messages.cache.get(guildDB.scoreId)?.edit({ embeds: [ embed ] });
    }
  });
}

function setembed(guildDB: guild_type): MessageEmbed {
  let quizDB = client.quizdb(guildDB.id);
  var list: string[] = [];
  quizDB.score.forEach((value, key) => {
    if (key !== "skip") list.push(`<@${key}> : ${value}`);
  });
  if (!list || list.length === 0) {
    list.push("없음");
  }
  var text = "";
  list.forEach((v, i) => {
    text += `**${i+1}.** ${v}\n`;
  });
  text += `\n스킵한 문제 : ${quizDB.score.get("skip") ? quizDB.score.get("skip") : 0}개`;
  return client.mkembed({
    title: `**\` [ 퀴즈 스코어 ] \`**`,
    description: text,
    footer: { text: `스코어는 다음퀴즈 전까지 사라지지 않습니다.` }
  });
}