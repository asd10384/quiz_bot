import { client } from "../index";
import { Command } from "../interfaces/Command";
// import { Logger } from "../utils/Logger";
import { Message, EmbedBuilder, ApplicationCommandOptionType, ChatInputApplicationCommandData, CommandInteraction, ChannelType, TextChannel } from "discord.js";
import { check_permission as ckper, embed_permission as emper } from "../utils/Permission";
import { guildData, QDB } from "../databases/Quickdb";
import { QUIZ_RULE } from "../config/config";
import { getUserChannel } from "../quiz/getChannel";
import { DiscordGatewayAdapterCreator, joinVoiceChannel } from "@discordjs/voice";
import { Logger } from "../utils/Logger";

/**
 * DB
 * const GDB = await QDB.get(interaction.guild!);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

export default class implements Command {
  /** 해당 명령어 설명 */
  name = "퀴즈";
  visible = true;
  description = "play quiz";
  information = "디스코드에서 퀴즈";
  aliases: string[] = [ "quiz" ];
  metadata: ChatInputApplicationCommandData = {
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
        name: "중복초기화",
        description: "중복방지를위해 저장한 목록 제거."
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
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "join",
        description: "음성채널 접속",
        options: [{
          type: ApplicationCommandOptionType.Channel,
          name: "channel",
          description: "채널",
          channelTypes: [ ChannelType.GuildVoice, ChannelType.GuildStageVoice ],
          required: true
        }]
      }
    ]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    const cmd = interaction.options.data[0];
    if (cmd.name == "join") {
      const channel = cmd.options ? cmd.options[0]?.channel : undefined;
      if (!channel) return client.mkembed({
        title: `채널을 찾을수 없음`,
        color: "DarkRed"
      });
      if (channel.type == ChannelType.GuildVoice || channel.type == ChannelType.GuildStageVoice) {
        joinVoiceChannel({
          adapterCreator: interaction.guild!.voiceAdapterCreator! as DiscordGatewayAdapterCreator,
          channelId: channel.id,
          guildId: interaction.guildId!
        });
      }
      return client.mkembed({
        title: `음성채널이 아님`,
        color: "DarkRed"
      });
    }
    if (cmd.name == "채널생성") {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      const guildDB = await QDB.guild.get(interaction.guild!);
      return await interaction.editReply({ content: await this.create_channel(interaction, guildDB) });
    }
    if (cmd.name == "중복초기화") {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      const guildDB = await QDB.guild.get(interaction.guild!);
      return await interaction.editReply({ content: await this.overLapReset(guildDB) });
    }
    if (cmd.name == "fix") {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      const guildDB = await QDB.guild.get(interaction.guild!);
      return await interaction.editReply({ content: await this.fix(interaction, guildDB) });
    }
    if (cmd.name == '도움말') {
      return await interaction.editReply({ embeds: [ this.help() ] });
    }
    return await interaction.followUp({ embeds: [ this.help() ] });
  }
  async messageRun(message: Message, args: string[]) {
    const qc = client.getqc(message.guild!);
    if (args[0] == "시작") {
      client.msgdelete(message, 10, true);
      if (qc.page.userId) {
        return message.channel.send({ embeds: [
          client.mkembed({
            title: `**퀴즈 시작 오류**`,
            description: `이미 퀴즈가 시작되었습니다.`,
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 1));
      }
      if (!getUserChannel(message.member!)) return message.channel.send({ embeds: [
        client.mkembed({
          title: `\` 음성 오류 \``,
          description: `먼저 음성채널에 들어간뒤 사용해주세요.`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      return qc.ready(message, message.author.id);
    }
    if (args[0] == "중복초기화") {
      client.msgdelete(message, 10, true);
      if (qc.page.userId) {
        return message.channel.send({ embeds: [
          client.mkembed({
            title: `**퀴즈 시작 오류**`,
            description: `이미 퀴즈가 시작되었습니다.\n퀴즈를 종료하고 사용해주세요.`,
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 1));
      }
      const guildDB = await QDB.guild.get(message.guild!);
      return message.channel.send({ content: await this.overLapReset(guildDB) }).then(m => client.msgdelete(m, 2));
    }
    if (args[0] == "중지" || args[0] == "종료") {
      return qc.stop();
    }
    if (args[0] == "설정") {
      client.msgdelete(message, 10, true);
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      return message.channel.send({ content: "현재 제작중 입니다." }).then(m => client.msgdelete(m, 1));
    }
    if (args[0] == "스킵") {
      client.msgdelete(message, 10, true);
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      return qc.anser(["스킵", "관리자"], message.author.id);
    }
    if (args[0] == "힌트") {
      client.msgdelete(message, 10, true);
      if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
      return qc.setHint(message, message.author.id, true);
    }
    if (args[0] == "fix") {
      const guildDB = await QDB.guild.get(message.guild!);
      return this.fix(message, guildDB);
    }
    if (args[0] == "도움말" || args[0] == "help") return message.channel.send({ embeds: [ this.help() ] }).then(m => client.msgdelete(m, 4.5));
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }

  async create_channel(message: Message | CommandInteraction, guildDB: guildData): Promise<string> {
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
          description: `**문제수 : ${guildDB.options.onetimemax}개씩**\n**다음문제시간: ${guildDB.options.nexttime}초**`,
          image: `https://ytms.netlify.app/defult.png`,
          footer: { text: `${client.prefix}퀴즈 도움말` }
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
    return await QDB.guild.set(guildDB.id, {
      channelId: channel.id,
      scoreId: score.id,
      msgId: msg.id
    }).then(() => {
      return `<#${channel.id}> creation complete!`;
    }).catch(() => {
      return `오류`;
    });
  }

  async fix(message: Message | CommandInteraction, guildDB: guildData): Promise<string> {
    let channel = message.guild!.channels.cache.get(guildDB.channelId);
    if (channel?.type == ChannelType.GuildText) {
      client.getqc(message.guild!).stop(true);
      await channel.messages.fetch({ cache: true }).then((msg) => {
        try {
          if (msg.size > 0) (channel as TextChannel).bulkDelete(msg.size).catch(() => { if (client.debug) Logger.error('메세지 전체 삭제 오류'); });
        } catch {}
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
            description: `**문제수 : ${guildDB.options.onetimemax}개씩**\n**다음문제시간: ${guildDB.options.nexttime}초**`,
            image: `https://ytms.netlify.app/defult.png`,
            footer: { text: `${client.prefix}퀴즈 도움말` }
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
      await QDB.guild.set(guildDB.id, {
        channelId: (channel as TextChannel).id,
        scoreId: score.id,
        msgId: msg.id
      }).catch(() => {});
    }, 350);
    return `fix 실행 완료.`;
  }

  async overLapReset(guildDB: guildData): Promise<string> {
    const check = await QDB.guild.set(guildDB.id, { overLapQueue: [] });
    if (check) return "초기화 완료";
    return "초기화 실패";
  }
}