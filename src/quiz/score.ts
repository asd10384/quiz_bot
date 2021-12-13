import { client } from "..";
import { M, PM, I } from "../aliases/discord.js.js";
import { guild_type, nowplay } from "../database/obj/guild";
import MDB from "../database/Mongodb";
import { TextChannel } from "discord.js";

export default async function setscore(message: M | PM | I) {
  MDB.module.guild.findOne({ id: message.guildId! }).then((guildDB) => {
    if (guildDB) {
      let embed = setembed(guildDB);
      let channel = message.guild?.channels.cache.get(guildDB.channelId);
      (channel as TextChannel).messages.cache.get(guildDB.scoreId)?.edit({ embeds: [ embed ] });
    }
  });
}

function setembed(guildDB: guild_type) {
  let quizDB = client.quizdb(guildDB.id);
  let data = quizDB.nowplaying!;
  var title = '';
  if (quizDB.playing) {
    title = `**[${data.duration}] - ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title}**`;
  } else {
    title = `**현재 노래가 재생되지 않았습니다**.`;
    data.image = 'https://cdn.hydra.bot/hydra_no_music.png';
  }
  let em = client.mkembed({
    title: title,
    image: data.image,
    url: data.url,
    color: client.embedcolor
  });
  if (quizDB.playing && guildDB.options.player) em.setDescription(`노래 요청자: ${data.player}`);
  if (quizDB.playing) em.setFooter(`${quizDB.queue.length}개의 노래가 대기열에 있습니다. | Volume: ${guildDB.options.volume}%`);
  return em;
}