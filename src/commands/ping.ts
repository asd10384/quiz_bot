import { client } from "../index";
import { Command } from "../interfaces/Command";
import { Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, ChatInputApplicationCommandData, ButtonInteraction, CommandInteraction } from "discord.js";

export default class implements Command {
  name = "ping";
  visible = true;
  description = "PONG!";
  information = "핑 확인";
  aliases: string[] = [ "핑" ];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    return await interaction.followUp(this.ping());
  }
  async messageRun(message: Message) {
    return message.channel.send(this.ping()).then(m => client.msgdelete(m, 3));
  }
  async buttonRun(interaction: ButtonInteraction) {
    return await interaction.followUp(this.ping());
  }

  ping(): { embeds: [ EmbedBuilder ], components: [ ActionRowBuilder<ButtonBuilder> ], ephemeral: boolean } {
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ping-restart")
        .setLabel("다시 측정")
        .setStyle(ButtonStyle.Success)
    );
    const embed = client.mkembed({
      title: `Pong!`,
      description: `**${client.ws.ping}ms**`
    });
    return { embeds: [ embed ], components: [ actionRow ], ephemeral: true };
  }
}