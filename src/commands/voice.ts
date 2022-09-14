import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js.js";
import { Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ApplicationCommandOptionType, ChannelType } from "discord.js";
import QDB from "../database/Quickdb";
import { DiscordGatewayAdapterCreator, joinVoiceChannel } from "@discordjs/voice";

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
  name = "음성";
  visible = true;
  description = "voice";
  information = "음성";
  aliases: string[] = [];
  metadata: D = {
    name: this.name,
    description: this.description,
    options: [
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
  async slashrun(interaction: I) {
    const cmd = interaction.options.data[0];
    if (cmd.name === "join") {
      const channel = cmd.options ? cmd.options[0]?.channel : undefined;
      if (!channel) return client.mkembed({
        title: `채널을 찾을수 없음`,
        color: "DarkRed"
      });
      if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
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
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }
}