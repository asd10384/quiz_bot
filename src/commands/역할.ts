import { client } from "../index";
import { Command } from "../interfaces/Command";
import { Message, EmbedBuilder, ApplicationCommandOptionType, ChatInputApplicationCommandData, CommandInteraction } from "discord.js";
import { check_permission as ckper, embed_permission as emper } from "../utils/Permission";
import { QDB, guildData } from "../databases/Quickdb";

/**
 * DB
 * const GDB = await QDB.get(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 */

/** 역할 명령어 */
export default class implements Command {
  /** 해당 명령어 설명 */
  name = "역할";
  visible = true;
  description = "특정 명령어 사용가능한 역할 설정";
  information = "특정 명령어 사용가능한 역할 설정";
  aliases = [ "role" ];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: '도움말',
        description: '역할 도움말'
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: '목록',
        description: '등록된 역할 확인'
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: '추가',
        description: '특정 명령어 사용가능한 역할 추가',
        options: [{
          type: ApplicationCommandOptionType.Role,
          name: '역할',
          description: '역할',
          required: true
        }]
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: '제거',
        description: '특정 명령어 사용가능한 역할 제거',
        options: [{
          type: ApplicationCommandOptionType.Role,
          name: '역할',
          description: '역할',
          required: true
        }]
      }
    ]
  };

  msgmetadata?: { name: string, des: string }[] = [
    {
      name: "도움말",
      des: "역할 도움말"
    },
    {
      name: "목록",
      des: "등록된 역할 확인"
    },
    {
      name: "추가",
      des: "특정 명령어 사용가능한 역할 추가"
    },
    {
      name: "제거",
      des: "특정 명령어 사용가능한 역할 제거"
    }
  ];

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
    const cmd = interaction.options.data[0];
    const role = cmd.options ? cmd.options[0]?.role : undefined;
    const GDB = await QDB.guild.get(interaction.guild!);
    if (cmd.name === '목록') return await interaction.followUp({ embeds: [ this.list(GDB) ] });
    if (cmd.name === '추가') return await interaction.followUp({ embeds: [ await this.add(GDB, role!.id) ] });
    if (cmd.name === '제거') return await interaction.followUp({ embeds: [ await this.remove(GDB, role!.id) ] });
    return await interaction.followUp({ embeds: [
      client.help(this.name, this.metadata, this.msgmetadata)!
    ] });
  }
  async messageRun(message: Message, args: string[]) {
    if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] });
    const GDB = await QDB.guild.get(message.guild!);
    if (!GDB) return message.channel.send({ embeds: [ client.mkembed({
      title: `데이터베이스오류`,
      description: "다시시도해주세요.",
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 1));
    if (args[0] === "목록") return message.channel.send({ embeds: [ this.list(GDB) ] }).then(m => client.msgdelete(m, 4));
    if (args[0] === "추가") {
      if (args[1]) {
        const role = message.guild?.roles.cache.get(args[1]);
        if (role) return message.channel.send({ embeds: [ await this.add(GDB, role.id) ] }).then(m => client.msgdelete(m, 2));
      }
      return message.channel.send({ embeds: [ this.err("추가", "역할을 찾을수 없습니다.") ] }).then(m => client.msgdelete(m, 1));
    }
    if (args[0] === "제거") {
      if (args[1]) {
        const role = message.guild?.roles.cache.get(args[1]);
        if (role) return message.channel.send({ embeds: [ await this.remove(GDB, role.id) ] }).then(m => client.msgdelete(m, 2));
      }
      return message.channel.send({ embeds: [ this.err("제거", "역할을 찾을수 없습니다.") ] }).then(m => client.msgdelete(m, 1));
    }
    return message.channel.send({ embeds: [ client.help(this.name, this.metadata, this.msgmetadata)! ] }).then(m => client.msgdelete(m, 5));
  }

  err(name: string, desc: string): EmbedBuilder {
    return client.mkembed({
      title: `\` 역할 ${name} 오류 \``,
      description: desc,
      footer: { text: `${client.prefix}역할 도움말` },
      color: "DarkRed"
    })
  }

  list(GDB: guildData): EmbedBuilder {
    let text: string = '';
    GDB.role.forEach((roleID) => {
      text += `<@&${roleID}>\n`;
    });
    return client.mkembed({
      title: `\` 역할 목록 \``,
      description: (text && text !== '') ? text : '등록된 역할 없음'
    });
  }

  async add(GDB: guildData, roleId: string): Promise<EmbedBuilder> {
    if (GDB.role.includes(roleId)) {
      return client.mkembed({
        title: `\` 역할 추가 오류 \``,
        description: `<@&${roleId}> 역할이 이미 등록되어 있습니다.`,
        footer: { text: `목록: /역할 목록` },
        color: 'DarkRed'
      });
    } else {
      GDB.role.push(roleId);
      return await QDB.guild.set(GDB.id, { role: GDB.role }).then((val) => {
        if (!val) return client.mkembed({
          title: `\` 역할 추가 오류 \``,
          description: `<@&${roleId}> 역할 추가 중 오류발생`,
          color: "DarkRed"
        });
        return client.mkembed({
          title: `\` 역할 추가 \``,
          description: `<@&${roleId}> 역할 추가 완료`,
          footer: { text: `목록: /역할 목록` }
        });
      }).catch(() => {
        return client.mkembed({
          title: `\` 역할 추가 오류 \``,
          description: `<@&${roleId}> 역할 추가 중 오류발생`,
          color: "DarkRed"
        });
      });
    }
  }

  async remove(GDB: guildData, roleId: string): Promise<EmbedBuilder> {
    if (GDB.role.includes(roleId)) {
      let list: string[] = [];
      GDB!.role.forEach((ID) => {
        if (ID !== roleId) list.push(ID);
      });
      GDB.role = list;
      return await QDB.guild.set(GDB.id, { role: GDB.role }).then((val) => {
        if (!val) return client.mkembed({
          title: `\` 역할 제거 오류 \``,
          description: `<@&${roleId}> 역할 제거 중 오류발생`,
          color: "DarkRed"
        });
        return client.mkembed({
          title: `\` 역할 제거 \``,
          description: `<@&${roleId}> 역할 제거 완료`,
          footer: { text: `목록: /역할 목록` }
        });
      }).catch(() => {
        return client.mkembed({
          title: `\` 역할 제거 오류 \``,
          description: `<@&${roleId}> 역할 제거 중 오류발생`,
          color: "DarkRed"
        });
      });
    } else {
      return client.mkembed({
        title: `\` 역할 제거 오류 \``,
        description: `<@&${roleId}> 역할이 등록되어있지 않습니다.`,
        footer: { text: `목록: /역할 목록` },
        color: 'DarkRed'
      });
    }
  }
}