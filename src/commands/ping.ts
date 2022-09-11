import { client } from "../index";
import { Command } from "../interfaces/Command";
import { I, D, B } from "../aliases/discord.js";
import { Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, ActionRow, MessageActionRowComponent, ActionRowComponent } from "discord.js";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** 핑 명령어 */
export default class PingCommand implements Command {
  /** 해당 명령어 설명 */
  name = "ping";
  visible = true;
  description = "PONG!";
  information = "핑 확인";
  aliases: string[] = [ "핑" ];
  metadata: D = {
    name: this.name,
    description: this.description
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    return await interaction.editReply(this.ping());
  }
  async msgrun(message: Message, args: string[]) {
    return message.channel.send(this.ping()).then(m => client.msgdelete(m, 3));
  }
  async buttonrun(interaction: B, args: string[]) {
    return await interaction.editReply(this.ping());
  }

  ping(): { embeds: [ EmbedBuilder ], components: [ ActionRowBuilder<ButtonBuilder> ] } {
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ping-restart")
        .setLabel("다시 측정")
        .setStyle(ButtonStyle.Success)
    );
    const embed = client.mkembed({
      title: `Pong!`,
      description: `**${client.ws.ping}ms**`,
      color: client.embedcolor
    });
    return { embeds: [ embed ], components: [ actionRow ] };
  }
}