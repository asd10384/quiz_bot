import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js.js";
import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import MDB from "../database/Mongodb";
import { guild_type } from "../database/obj/guild";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** 역할 명령어 */
export default class 역할Command implements Command {
  /** 해당 명령어 설명 */
  name = "역할";
  visible = true;
  description = "특정 명령어 사용가능한 역할 설정";
  information = "특정 명령어 사용가능한 역할 설정";
  aliases = [ "role" ];
  metadata = <D>{
    name: this.name,
    description: this.description,
    options: [
      {
        type: 'SUB_COMMAND',
        name: '도움말',
        description: '역할 도움말'
      },
      {
        type: 'SUB_COMMAND',
        name: '목록',
        description: '등록된 역할 확인'
      },
      {
        type: 'SUB_COMMAND',
        name: '추가',
        description: '특정 명령어 사용가능한 역할 추가',
        options: [{
          type: 'ROLE',
          name: '역할',
          description: '역할',
          required: true
        }]
      },
      {
        type: 'SUB_COMMAND',
        name: '제거',
        description: '특정 명령어 사용가능한 역할 제거',
        options: [{
          type: 'ROLE',
          name: '역할',
          description: '역할',
          required: true
        }]
      }
    ]
  };

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
    const cmd = interaction.options.getSubcommand();
    const role = interaction.options.getRole('역할');
    let guildDB = await MDB.get.guild(interaction.guild!);
    if (cmd === '목록') return await interaction.editReply({ embeds: [ this.list(guildDB!) ] });
    if (cmd === '추가') return await interaction.editReply({ embeds: [ this.add(guildDB!, role!.id) ] });
    if (cmd === '제거') return await interaction.editReply({ embeds: [ this.remove(guildDB!, role!.id) ] });
    if (cmd === '도움말') return await interaction.editReply({ embeds: [ client.help(this.name, this.metadata, true) ] });
  }
  async msgrun(message: Message, args: string[]) {
    if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] });
    let guildDB = await MDB.get.guild(message.guild!);
    if (args[0] === "목록") return message.channel.send({ embeds: [ this.list(guildDB!) ] }).then(m => client.msgdelete(m, 4));
    if (args[0] === "추가") {
      if (args[1]) {
        const role = message.guild?.roles.cache.get(args[1]);
        if (role) return message.channel.send({ embeds: [ this.add(guildDB!, role.id) ] }).then(m => client.msgdelete(m, 2));
      }
      return message.channel.send({ embeds: [ this.err("추가", "역할을 찾을수 없습니다.") ] }).then(m => client.msgdelete(m, 1));
    }
    if (args[0] === "제거") {
      if (args[1]) {
        const role = message.guild?.roles.cache.get(args[1]);
        if (role) return message.channel.send({ embeds: [ this.remove(guildDB!, role.id) ] }).then(m => client.msgdelete(m, 2));
      }
      return message.channel.send({ embeds: [ this.err("제거", "역할을 찾을수 없습니다.") ] }).then(m => client.msgdelete(m, 1));
    }
    return message.channel.send({ embeds: [ client.help(this.name, this.metadata) ] }).then(m => client.msgdelete(m, 5));
  }

  err(name: string, desc: string): MessageEmbed {
    return client.mkembed({
      title: `\` 역할 ${name} 오류 \``,
      description: desc,
      footer: { text: `${client.prefix}역할 도움말` },
      color: "DARK_RED"
    })
  }

  list(guildDB: guild_type): MessageEmbed {
    let text: string = '';
    guildDB.role.forEach((roleID) => {
      text += `<@&${roleID}>\n`;
    });
    return client.mkembed({
      title: `\` 역할 목록 \``,
      description: (text && text !== '') ? text : '등록된 역할 없음',
      color: client.embedcolor
    });
  }

  add(guildDB: guild_type, roleId: string): MessageEmbed {
    if (guildDB.role.includes(roleId)) {
      return client.mkembed({
        title: `\` 역할 추가 오류 \``,
        description: `<@&${roleId}> 역할이 이미 등록되어 있습니다.`,
        footer: { text: `목록: /역할 목록` },
        color: 'DARK_RED'
      });
    } else {
      guildDB.role.push(roleId);
      guildDB.save().catch((err) => console.error(err));
      return client.mkembed({
        title: `\` 역할 추가 \``,
        description: `<@&${roleId}> 역할 추가 완료`,
        footer: { text: `목록: /역할 목록` },
        color: client.embedcolor
      });
    }
  }

  remove(guildDB: guild_type, roleId: string): MessageEmbed {
    if (guildDB.role.includes(roleId)) {
      let list: string[] = [];
      guildDB!.role.forEach((ID) => {
        if (ID !== roleId) list.push(ID);
      });
      guildDB.role = list;
      guildDB.save().catch((err) => console.error(err));
      return client.mkembed({
        title: `\` 역할 제거 \``,
        description: `<@&${roleId}> 역할 제거 완료`,
        footer: { text: `목록: /역할 목록` },
        color: client.embedcolor
      });
    } else {
      return client.mkembed({
        title: `\` 역할 제거 오류 \``,
        description: `<@&${roleId}> 역할이 등록되어있지 않습니다.`,
        footer: { text: `목록: /역할 목록` },
        color: 'DARK_RED'
      });
    }
  }
}