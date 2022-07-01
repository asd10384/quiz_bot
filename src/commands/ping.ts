import { client } from "../index";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js";
import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

/**
 * DB
 * const guildDB = await MDB.get.guild(interaction);
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
  aliases = [ "핑" ];
  metadata = <D>{
    name: this.name,
    description: this.description
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    const id = Math.random().toString(36).substring(2, 5);
    await interaction.editReply(this.ping());
    const i = await interaction.channel?.awaitMessageComponent({
      filter: (i) => i.customId === id && i.user.id === interaction.user.id,
      componentType: 'BUTTON'
    });
    if (!i) return;
    await i.deferReply();
    this.slashrun(i as unknown as I);
  }
  async msgrun(message: Message, args: string[]) {
    const id = Math.random().toString(36).substring(2, 5);
    message.channel.send(this.ping()).then(m => client.msgdelete(m, 3));
    const i = await message.channel?.awaitMessageComponent({
      filter: (i) => i.customId === id && i.user.id === message.member?.id,
      componentType: 'BUTTON'
    });
    if (!i) return;
    this.msgrun(i as unknown as Message, []);
  }

  ping(): { embeds: [ MessageEmbed ], components: [ MessageActionRow ] } {
    const id = Math.random().toString(36).substring(2, 5);
    const actionRow = new MessageActionRow().addComponents(
      new MessageButton({ customId: id, label: '다시 측정', style: 'SUCCESS' })
    );
    const embed = client.mkembed({
      title: `Pong!`,
      description: `**${client.ws.ping}ms**`,
      color: client.embedcolor
    });
    return { embeds: [ embed ], components: [ actionRow ] };
  }
}