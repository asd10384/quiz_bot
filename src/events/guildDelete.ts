import { Guild } from "discord.js";
import "dotenv/config";
import { QDB } from "../databases/Quickdb";
import { Logger } from "../utils/Logger";

/** onReady 핸들러 */
export const guildDelete = (guild: Guild) => {
  QDB.guild.del(guild.id).then((val) => {
    if (val) Logger.log(`서버 삭제 성공: ${guild.name}`);
    else Logger.log(`서버를 삭제 실패: 발견하지 못함`);
  }).catch(() => {
    Logger.log(`서버를 삭제 실패: 발견하지 못함`);
  });
}