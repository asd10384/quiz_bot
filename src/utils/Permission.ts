import { EmbedBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMemberRoleManager, Message, PermissionsBitField } from "discord.js";
import "dotenv/config";
import { client } from "..";
import { QDB } from "../databases/Quickdb";

const check_admin = (message: CommandInteraction | Message): boolean => {
  if (process.env.ADMIN_ID && (process.env.ADMIN_ID === message.member?.user.id)) return true;
  return false;
}

export const check_permission = async (message: CommandInteraction | Message): Promise<boolean> => {
  if (check_admin(message)) return true;
  let userper = message.member?.permissions as PermissionsBitField;
  if (userper && userper.has("Administrator")) return true;
  const GDB = await QDB.guild.get(message.guild!);
  let userrole = message.member?.roles as GuildMemberRoleManager;
  if (userrole && userrole.cache.some(role => GDB.role.includes(role.id))) return true;
  return false;
}

export const embed_permission: EmbedBuilder = client.mkembed({
  description: `이 명령ㅇ어를 사용할\n권한이 없습니다.`,
  color: "DarkRed"
});