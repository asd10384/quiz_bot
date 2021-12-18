import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js.js";
import { ColorResolvable, Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import MDB from "../database/Mongodb";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** 예시 명령어 */
export default class ExampleCommand implements Command {
  /** 해당 명령어 설명 */
  name = "임베드";
  visible = true;
  description = "";
  information = "";
  aliases = [ "embed" ];
  metadata = <D>{
    name: this.name,
    description: this.description
  };

  /** 실행되는 부분 */
  async msgrun(message: Message, args: string[]) {
    if (args[0] === "help" || args[0] === "도움말" || args[0] === "명령어") return message.channel.send({ embeds: [ this.help() ] }).then(m => client.msgdelete(m, 4));
    if (args[0] === "color" || args[0] === "색깔") {
      const list = [
        'DEFAULT', 
        'WHITE', 
        'AQUA', 
        'GREEN', 
        'BLUE', 
        'YELLOW', 
        'PURPLE', 
        'LUMINOUS_VIVID_PINK', 
        'FUCHSIA', 
        'GOLD', 
        'ORANGE', 
        'RED', 
        'GREY', 
        'DARKER_GREY', 
        'NAVY', 
        'DARK_AQUA', 
        'DARK_GREEN', 
        'DARK_BLUE', 
        'DARK_PURPLE', 
        'DARK_VIVID_PINK', 
        'DARK_GOLD', 
        'DARK_ORANGE', 
        'DARK_RED', 
        'DARK_GREY', 
        'LIGHT_GREY', 
        'DARK_NAVY', 
        'BLURPLE', 
        'GREYPLE', 
        'DARK_BUT_NOT_BLACK', 
        'NOT_QUITE_BLACK', 
        'RANDOM'
      ];
      return message.channel.send({ embeds: [
        client.mkembed({
          title: `\` 임베드 색깔 \``,
          description: list.join("\n"),
          color: client.embedcolor
        })
      ] }).then(m => client.msgdelete(m, 4));
    }
    if (args[0] && args[1]) {
      const args2 = args.slice(1).join(' ').split("#@#");
      const embed = client.mkembed({
        title: args2[0],
        color: args[0] as ColorResolvable
      });
      if (args2[1]) embed.setDescription(args2[1]);
      return message.channel.send({ embeds: [ embed ] });
    }
    return message.channel.send({ embeds: [ this.help() ] }).then(m => client.msgdelete(m, 4));
  }

  help(): MessageEmbed {
    return client.mkembed({
      title: `\` 임베드 도움말 \``,
      description: `${client.prefix}임베드 색깔\n${client.prefix}임베드 [색깔] [제목]#@#[내용]#@#[참고]`,
      footer: { text: `example` },
      color: client.embedcolor
    });
  }
}