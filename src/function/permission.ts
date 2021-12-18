import { client } from "../index";
import MDB from "../database/Mongodb";
import { I, M } from "../aliases/discord.js";
import { GuildMemberRoleManager, MessageEmbed, Permissions } from "discord.js";
import { config } from "dotenv";
config();

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 */

export async function check_permission(msg: I | M): Promise<boolean> {
  if (process.env.ADMINID && (process.env.ADMINID === msg.member?.user.id)) return true;
  let userper = msg.member?.permissions as Permissions;
  if (userper) if (userper.has('ADMINISTRATOR')) return true;
  let guildDB = await MDB.get.guild(msg);
  let guildrole = guildDB!.role;
  let userrole = msg.member?.roles as GuildMemberRoleManager;
  if (userrole) if (userrole.cache.some((role) => guildrole.includes(role.id))) return true;
  return false;
}

export const embed_permission: MessageEmbed = client.mkembed({
  description: `이 명령어를 사용할\n권한이 없습니다.`,
  color: 'DARK_RED'
});
