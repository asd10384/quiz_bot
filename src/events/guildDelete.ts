import "dotenv/config";
import { Guild } from "discord.js";
import { client } from "../index";
import { QDB } from "../databases/Quickdb";
import { Logger } from "../utils/Logger";

/** onReady 핸들러 */
export const guildDelete = (guild: Guild) => QDB.guild.del(guild.id).then((val) => {
  if (!val) return Logger.error(`서버를 삭제 실패: 발견하지 못함`);
  return Logger.log(`서버 삭제 성공: ${guild.name}`);
}).catch(() => {
  if (client.debug) Logger.error(`서버 삭제 실패: 오류발생`);
});