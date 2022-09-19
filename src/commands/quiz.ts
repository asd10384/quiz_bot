import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js.js";
import { Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ApplicationCommandOptionType, TextChannel, ChannelType } from "discord.js";
import QDB, { qdbdata } from "../database/Quickdb";
import { QUIZ_RULE } from "../config";
import { getuserchannel } from "../quiz/getChannel";

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
    const qc = client.getqc(message.guild!);
    if (args[0] === "시작") {
      client.msgdelete(message, 10, true);
      if (qc.page.start.length > 0) {
        return message.channel.send({ embeds: [
          client.mkembed({
            title: `**퀴즈 시작 오류**`,
            description: `이미 퀴즈가 시작되었습니다.`,
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 1));
      }
      if (!getuserchannel(message.member!)) return message.channel.send({ embeds: [
        client.mkembed({
          title: `\` 음성 오류 \``,
          description: `먼저 음성채널에 들어간뒤 사용해주세요.`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return qc.start(message, message.author.id);
    }
    if (args[0] === "중지" || args[0] === "종료") {
      return qc.stop(message.guild!);
    }
    if (args[0] === "설정") {
      client.msgdelete(message, 10, true);
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      return message.channel.send({ content: "현재 제작중 입니다." }).then(m => client.msgdelete(m, 1));
    }
    if (args[0] === "스킵") {
      client.msgdelete(message, 10, true);
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      if (qc.playquiztype.quiz === "음악퀴즈") return qc.music_anser(message, ["스킵", "관리자"], message.author.id);
      // if (qc.playquiztype.quiz === "그림퀴즈") return qc.img_anser(message, ["스킵", "관리자"], message.author.id);
      return qc.stop(message.guild!);
    }
    if (args[0] === "힌트") {
      client.msgdelete(message, 10, true);
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      return qc.hint(message, message.author.id, true);
    }
    if (args[0] === "fix") {
      const guildDB = await QDB.get(message.guild!);
      if (!guildDB) return message.channel.send({ embeds: [ client.mkembed({
        title: `데이터베이스 오류`,
        description: "데이터베이스를 찾을수없음",
        color: "DarkRed"
      }) ] }).then(m => client.msgdelete(m, 1));
      return this.fix(message, guildDB);
    }
    if (args[0] === "도움말" || args[0] === "help") return message.channel.send({ embeds: [ this.help() ] }).then(m => client.msgdelete(m, 4.5));
    return;
  }

  help(): EmbedBuilder {
    return client.mkembed({
      title: `\` 퀴즈 도움말 \``,
      description: `
        \` 명령어 \`
        ${client.prefix}퀴즈 시작 : 퀴즈를 시작합니다.
        ${client.prefix}퀴즈 중지 : 진행중인 퀴즈를 멈춥니다.
        ${client.prefix}퀴즈 설정 : 정답형식이나 시간을 설정할수 있습니다.
        \` 관리자 명령어 \`
        /퀴즈 기본설정 : 퀴즈를 사용할 채널을 생성합니다.
        /퀴즈 fix : 퀴즈 채널의 오류를 수정합니다.
        ${client.prefix}퀴즈 스킵 : 투표없이 스킵합니다.
        ${client.prefix}퀴즈 힌트 :투표없이 힌트를 받습니다.
      `
    });
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
      await (channel as TextChannel).messages.fetch({ cache: true }).then((msg) => {
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