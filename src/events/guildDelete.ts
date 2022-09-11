import { Guild } from "discord.js";
import "dotenv/config";
import QDB from "../database/Quickdb";

/** onReady 핸들러 */
export default function guildDelete(guild: Guild) {
  QDB.del(guild.id).then((val) => {
    if (val) {
      console.log(`서버 삭제 성공: ${guild.name}`);
    } else {
      console.log(`서버를 삭제 실패: 발견하지 못함`);
    }
  }).catch((err) => {
    console.log(`서버를 삭제 실패: 발견하지 못함`);
  });
}