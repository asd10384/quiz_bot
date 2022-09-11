import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js.js";
import { Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ApplicationCommandOptionType, TextChannel, ChannelType } from "discord.js";
import QDB, { qdbdata } from "../database/Quickdb";
import { QUIZ_RULE } from "../config";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction.guild!);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** 예시 명령어 */
export default class ExampleCommand implements Command {
  /** 해당 명령어 설명 */
  name = "퀴즈";
  visible = true;
  description = "play quiz";
  information = "디스코드에서 퀴즈";
  aliases: string[] = [ "quiz" ];
  metadata: D = {
    name: this.name,
    description: this.description,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "채널생성",
        description: "퀴즈를 사용할 채널을 생성합니다."
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "fix",
        description: "퀴즈 채널의 오류를 수정합니다."
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "도움말",
        description: "퀴즈 도움말"
      }
    ]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    const cmd = interaction.options.data[0];
    if (cmd.name === "채널생성") {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      const guildDB = await QDB.get(interaction.guild!);
      return await interaction.editReply({ content: await this.create_channel(interaction, guildDB) });
    }
    if (cmd.name === "fix") {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      const guildDB = await QDB.get(interaction.guild!);
      return await interaction.editReply({ content: await this.fix(interaction, guildDB) });
    }
    if (cmd.name === '도움말') {
      return await interaction.editReply({ embeds: [ this.help() ] });
    }
  }
  async msgrun(message: Message, args: string[]) {
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `example`,
        description: `example`,
        footer: { text: `example` },
        color: client.embedcolor
      })
    ] }).then(m => client.msgdelete(m, 2));
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }
  
  async create_channel(message: Message | I, guildDB: qdbdata): Promise<string> {
    const channel = await message.guild?.channels.create({
      name: `QUIZ_CHANNEL`,
      // type: ChannelType.GuildText,
      topic: `퀴즈 시작: ${client.prefix}퀴즈 시작`
    });
    if (!channel) return "오류";
    const msg = await channel.send({
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
    const score = await channel.send({
      embeds: [
        client.mkembed({
          title: `**\` [ 퀴즈 스코어 ] \`**`,
          description: `**1.** 없음\n\n스킵한 문제: 0개`,
          footer: { text: "스코어는 다음퀴즈 전까지 사라지지 않습니다." }
        })
      ]
    });
    return await QDB.set(guildDB.id, {
      channelId: channel.id,
      scoreId: score.id,
      msgId: msg.id
    }).then(() => {
      return `<#${channel.id}> creation complete!`;
    }).catch((err) => {
      return `오류`;
    });
  }

  async fix(message: Message | I, guildDB: qdbdata): Promise<string> {
    let channel = message.guild!.channels.cache.get(guildDB.channelId);
    if (channel?.type === ChannelType.GuildText) {
      client.getqc(message.guild!).stop(message.guild!, true);
      await (channel as TextChannel).messages.fetch().then((msg) => {
        try {
          if (msg.size > 0) (channel as TextChannel).bulkDelete(msg.size).catch((err) => { if (client.debug) console.log('메세지 전체 삭제 오류'); });
        } catch (err) {}
      });
    } else {
      channel = await message.guild!.channels.create({
        name: "QUIZ_CHANNEL",
        // type: ChannelType.GuildText,
        topic: `퀴즈 시작: ${client.prefix}퀴즈 시작`
      });
    }
    setTimeout(async () => {
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
      await QDB.set(guildDB.id, {
        channelId: (channel as TextChannel).id,
        scoreId: score.id,
        msgId: msg.id
      }).catch((err) => {});
    }, 350);
    return `fix 실행 완료.`;
  }
}