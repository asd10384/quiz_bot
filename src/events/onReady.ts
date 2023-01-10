import "dotenv/config";
import { QDB } from "../databases/Quickdb";
import { client, handler } from "..";
import { Logger } from "../utils/Logger";
import { ChannelType } from "discord.js";
import { QUIZ_RULE } from "../config/config";

export const onReady = () => {
  if (!client.user) return;
  const prefix = client.prefix;
  let actlist: { text: string, time: number }[] = eval(process.env.ACTIVITY || '[{ "text": `/help`, time: 10 }, { "text": `${prefix}help`, "time": 10 }]');

  Logger.ready(`Ready! ${client.user.username}`);
  Logger.ready(`prefix: ${prefix}`);
  Logger.ready(`Activity: ${JSON.stringify(actlist)}`);
  Logger.ready(`로그확인: ${client.debug}`);

  if (process.env.REFRESH_SLASH_COMMAND_ON_READY === "true") handler.registCachedCommands(client);

  quizfix();

  if (actlist.length < 1) return;
  client.user.setActivity(actlist[0].text);
  if (actlist.length < 2) return;
  let i = 1;
  let time = actlist[1].time;
  setInterval(() => {
    client.user?.setActivity(actlist[i].text);
    if (++i >= actlist.length) i = 0;
    time = actlist[i].time;
  }, time * 1000);
}

function quizfix() {
  QDB.guild.all().then((val) => {
    val.forEach(async (guildDB) => {
      if (guildDB.id && guildDB.channelId) {
        const channel = client.guilds.cache.get(guildDB.id)?.channels.cache.get(guildDB.channelId);
        if (channel?.type == ChannelType.GuildText) {
          try {
            await channel.messages.fetch({ cache: true }).then(async (msgs) => {
              if (msgs.size > 0) await channel.bulkDelete(msgs.size).catch(() => {
                if (client.debug) Logger.error("메세지 전체 삭제 오류");
              });
            });
          } catch {}
          const msg = await channel.send({
            content: `${QUIZ_RULE(guildDB)}ㅤ`,
            embeds: [
              client.mkembed({
                title: `**현재 퀴즈가 시작되지 않았습니다**`,
                description: `**정답설정: ${guildDB.options.anser}**\n**다음문제시간: ${guildDB.options.nexttime}초**`,
                image: `https://ytms.netlify.app/defult.png`,
                footer: { text: `${client.prefix}퀴즈 도움말` }
              })
            ]
          });
          const score = await channel.send({
            embeds: [
              client.mkembed({
                title: `**\` [ 퀴즈 스코어 ] \`**`,
                description: `**1.** 없음\n\n스킵한 문제: 0개`,
                footer: { text: "스코어는 다음퀴즈 전까지 사라지지 않습니다." }
              })
            ]
          });
          return await QDB.guild.set(guildDB.id, { msgId: msg.id, scoreId: score.id }).then((val) => {
            if (val) {
              Logger.ready(`${msg.guild!.name} {\n  fix: 시작 fix 성공\n}`);
              client.getqc(msg.guild!).sendlog(`${msg.guild!.name} {\n  fix: 시작 fix 성공\n}`);
            } else {
              Logger.ready(`${msg.guild!.name} {\n  fix: 시작 fix 실패\n}`);
              client.getqc(msg.guild!).sendlog(`${msg.guild!.name} {\n  fix: 시작 fix 실패\n}`);
            }
          }).catch(() => {
            Logger.ready(`${msg.guild!.name} {\n  fix: 시작 fix 실패 ERR\n}`);
          });
        }
      }
    })
  })
}