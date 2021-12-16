import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js.js";
import { Message, MessageActionRow, MessageButton, StageChannel, VoiceChannel } from "discord.js";
import MDB from "../database/Mongodb";
import { joinVoiceChannel } from "@discordjs/voice";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** 음성 명령어 */
export default class 음성Command implements Command {
  /** 해당 명령어 설명 */
  name = "음성";
  visible = true;
  description = "voice";
  information = "음성";
  aliases = [];
  metadata = <D>{
    name: this.name,
    description: this.description,
    options: [{
      type: "SUB_COMMAND",
      name: "join",
      description: "음성채널 접속",
      options: [{
        type: "CHANNEL",
        name: "channel",
        description: "채널",
        channelTypes: [ "GUILD_VOICE", "GUILD_STAGE_VOICE" ],
        required: true
      }]
    }]
  };

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    const cmd = interaction.options.getSubcommand();
    if (cmd === "join") {
      const channel = interaction.options.getChannel("channel", true) as VoiceChannel | StageChannel;
      joinVoiceChannel({
        adapterCreator: interaction.guild!.voiceAdapterCreator!,
        channelId: channel.id,
        guildId: interaction.guildId!
      });
      return await interaction.editReply({ content: "채널 접속 성공" });
    }
  }
}