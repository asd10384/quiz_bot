import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js.js";
import { MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import MDB from "../database/Mongodb";
import { guild_type } from "../database/obj/guild";
import { config } from "dotenv";
import { QUIZ_RULE } from "../config";
import quiz_start from "../quiz/start";
import quiz_stop from "../quiz/stop";
import { getuserchannel } from "../quiz/getchannel";
import quiz_anser from "../quiz/anser";
config();

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** 퀴즈 명령어 */
export default class 퀴즈Command implements Command {
  /** 해당 명령어 설명 */
  name = "퀴즈";
  visible = true;
  description = "play quiz";
  information = "디스코드에서 퀴즈";
  aliases = [ "quiz" ];
  metadata = <D>{
    name: this.name,
    description: this.description,
    options: [
      {
        type: 'SUB_COMMAND',
        name: '채널생성',
        description: '퀴즈를 사용할 채널을 생성합니다.'
      },
      {
        type: 'SUB_COMMAND',
        name: 'fix',
        description: '퀴즈 채널의 오류를 수정합니다.'
      },
      {
        type: "SUB_COMMAND",
        name: "도움말",
        description: "퀴즈 도움말"
      }
    ]
  };

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    const cmd = interaction.options.getSubcommand();
    if (cmd === '채널생성') {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      let guildDB = await MDB.get.guild(interaction);
      return await interaction.editReply({ content: await this.create_channel(interaction, guildDB!) });
    }
    if (cmd === 'fix') {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      let guildDB = await MDB.get.guild(interaction);
      if (guildDB) {
        return await interaction.editReply({ content: await this.fix(interaction, guildDB) });
      }
      return await interaction.editReply({ content: "데이터베이스를 찾을수 없습니다." })
    }
    if (cmd === '도움말') {
      return await interaction.editReply({ embeds: [ this.help() ] });
    }
  }

  async msgrun(message: M, args: string[]): Promise<any> {
    if (args[0] === "시작") {
      const quizDB = client.quizdb(message.guildId!);
      if (quizDB.page.player) {
        return message.channel.send({ embeds: [
          client.mkembed({
            title: `**퀴즈 시작 오류**`,
            description: `이미 퀴즈가 시작되었습니다.`,
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 1));
      }
      if (!getuserchannel(message.member!)) return message.channel.send({ embeds: [
        client.mkembed({
          title: `\` 음성 오류 \``,
          description: `먼저 음성채널에 들어간뒤 사용해주세요.`,
          color: "DARK_RED"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return quiz_start(message, message.author.id);
    }
    if (args[0] === "중지" || args[0] === "종료") return quiz_stop(message);
    if (args[0] === "설정") {
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      return message.channel.send({ content: "현재 제작중 입니다." }).then(m => client.msgdelete(m, 1));
    }
    if (args[0] === "스킵") {
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      return quiz_anser(message, ["스킵", "관리자"], message.author.id);
    }
    if (args[0] === "힌트") {
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      // 힌트 명령어
      return message.channel.send({ content: "현재 제작중 입니다." }).then(m => client.msgdelete(m, 1));
    }
    if (args[0] === "fix") {
      const guildDB = await MDB.get.guild(message);
      return this.fix(message, guildDB!);
    }
    if (args[0] === "도움말" || args[0] === "help") return message.channel.send({ embeds: [ this.help() ] }).then(m => client.msgdelete(m, 4.5));
    return;
  }

  help(): MessageEmbed {
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

  async create_channel(message: M | I, guildDB: guild_type): Promise<string> {
    const channel = await message.guild?.channels.create(`QUIZ_CHANNEL`, {
      type: 'GUILD_TEXT',
      topic: `퀴즈 시작: ${client.prefix}퀴즈 시작`
    });
    const score = await channel?.send({
      embeds: [
        client.mkembed({
          title: `**\` [ 퀴즈 스코어 ] \`**`,
          description: `**1.** 없음\n\n스킵한 문제: 0개`,
          footer: { text: "스코어는 다음퀴즈 전까지 사라지지 않습니다." }
        })
      ]
    });
    const msg = await channel?.send({
      content: QUIZ_RULE(guildDB!),
      embeds: [
        client.mkembed({
          title: `**현재 퀴즈가 시작되지 않았습니다**`,
          description: `**정답설정: ${guildDB!.options.anser}**\n**다음문제시간: ${guildDB!.options.nexttime}초**`,
          image: `https://ytms.netlify.app/defult.png`,
          footer: { text: `${client.prefix}퀴즈 도움말` },
          color: client.embedcolor
        })
      ]
    });
    guildDB!.channelId = channel?.id!;
    guildDB!.scoreId = score?.id!;
    guildDB!.msgId = msg?.id!;
    await guildDB!.save().catch((err) => { if (client.debug) console.log('데이터베이스오류:', err) });
    return `<#${channel?.id!}> creation complete!`;
  }

  async fix(message: M | I, guildDB: guild_type): Promise<string> {
    let channel = message.guild?.channels.cache.get(guildDB.channelId);
    if (channel) {
      await (channel as TextChannel).messages.fetch().then((msg) => {
        try {
          if (msg.size > 0) (channel as TextChannel).bulkDelete(msg.size).catch((err) => { if (client.debug) console.log('메세지 전체 삭제 오류'); });
        } catch (err) {}
      });
    } else {
      channel = await message.guild?.channels.create(`QUIZ_CHANNEL`, {
        type: 'GUILD_TEXT',
        topic: `퀴즈 시작: ${client.prefix}퀴즈 시작`
      });
    }
    const score = await (channel as TextChannel).send({
      embeds: [
        client.mkembed({
          title: `**\` [ 퀴즈 스코어 ] \`**`,
          description: `**1.** 없음\n\n스킵한 문제: 0개`,
          footer: { text: "스코어는 다음퀴즈 전까지 사라지지 않습니다." }
        })
      ]
    });
    const msg = await (channel as TextChannel).send({
      content: QUIZ_RULE(guildDB!),
      embeds: [
        client.mkembed({
          title: `**현재 퀴즈가 시작되지 않았습니다**`,
          description: `**정답설정: ${guildDB!.options.anser}**\n**다음문제시간: ${guildDB!.options.nexttime}초**`,
          image: `https://ytms.netlify.app/defult.png`,
          footer: { text: `${client.prefix}퀴즈 도움말` },
          color: client.embedcolor
        })
      ]
    });
    guildDB!.channelId = channel?.id!;
    guildDB!.scoreId = score?.id!;
    guildDB!.msgId = msg?.id!;
    await guildDB!.save().catch((err) => { if (client.debug) console.log('데이터베이스오류:', err) });
    return `Error correction completed!`;
  }
}