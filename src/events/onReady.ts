import "dotenv/config";
import { client, handler } from "../index";
import QDB from "../database/Quickdb";
import { ChannelType, TextChannel } from "discord.js";
import { QUIZ_RULE } from "../config";

/** onReady 핸들러 */
export default async function onReady() {
  if (!client.user) return;

  const prefix = client.prefix;
  let actlist: { text: string, time: number }[] = eval(process.env.ACTIVITY!);

  console.log('Ready!', client.user.username);
  console.log('Activity:', JSON.stringify(actlist));
  console.log('로그확인:', client.debug);

  if (process.env.REFRESH_SLASH_COMMAND_ON_READY === 'true') handler.registCachedCommands(client);

  quizfix();

  client.user.setActivity(actlist[0].text);
  let i = 1;
  let time = actlist[1].time;
  setInterval(() => {
    client.user?.setActivity(actlist[i].text);
    if (++i >= actlist.length) i = 0;
    time = actlist[i].time;
  }, time * 1000);
}

function quizfix() {
  QDB.all().then((val) => {
    val.forEach(async (guildDB) => {
      if (guildDB.id && guildDB.channelId) {
        const channel = client.guilds.cache.get(guildDB.id)?.channels.cache.get(guildDB.channelId);
        if (channel?.type === ChannelType.GuildText) {
          (channel as TextChannel).messages.fetch().then(async (msgs) => {
            try {
              if (msgs.size > 0) (channel as TextChannel).bulkDelete(msgs.size).catch((err) => {
                if (client.debug) console.log('메세지 전체 삭제 오류');
              });
            } catch {}
          });
          const msg = await (channel as TextChannel).send({
            content: `${QUIZ_RULE(guildDB)}ㅤ`,
            embeds: [
              client.mkembed({
                title: `**현재 퀴즈가 시작되지 않았습니다**`,
                description: `**정답설정: ${guildDB.options.anser}**\n**다음문제시간: ${guildDB.options.nexttime}초**`,
                image: `https://ytms.netlify.app/defult.png`,
                footer: { text: `${client.prefix}퀴즈 도움말` },
                color: client.embedcolor
              })
            ]
          });
          const score = await (channel as TextChannel).send({
            embeds: [
              client.mkembed({
                title: `**\` [ 퀴즈 스코어 ] \`**`,
                description: `**1.** 없음\n\n스킵한 문제: 0개`,
                footer: { text: "스코어는 다음퀴즈 전까지 사라지지 않습니다." }
              })
            ]
          });
          console.log(`${msg.guild!.name} {\n  fix: 시작 fix 성공\n}`);
          client.getqc(msg.guild!).sendlog(`${msg.guild!.name} {\n  fix: 시작 fix 성공\n}`);
          return await QDB.set(guildDB.id, { msgId: msg.id, scoreId: score.id }).catch((err) => {});
        }
      }
    });
  });
}