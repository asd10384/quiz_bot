import "dotenv/config";
import { client } from "../index";
import QDB from "../database/Quickdb";
import { I, M } from "../aliases/discord.js";
import { GuildMemberRoleManager, EmbedBuilder, PermissionsBitField } from "discord.js";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 */

export async function check_admin(msg: I | M): Promise<boolean> {
  if (process.env.ADMINID && (process.env.ADMINID === msg.member?.user.id)) return true;
  return false;
}

export async function check_permission(msg: I | M): Promise<boolean> {
  if (process.env.ADMINID && (process.env.ADMINID === msg.member?.user.id)) return true;
  let userper = msg.member?.permissions as PermissionsBitField;
  if (userper) if (userper.has("Administrator")) return true;
  let guildDB = await QDB.get(msg.guild!);
  let guildrole = guildDB.role;
  let userrole = msg.member?.roles as GuildMemberRoleManager;
  if (userrole) if (userrole.cache.some((role) => guildrole.includes(role.id))) return true;
  return false;
}

export const embed_permission: EmbedBuilder = client.mkembed({
  description: `이 명령어를 사용할\n권한이 없습니다.`,
  color: 'DarkRed'
});
