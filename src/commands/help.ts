import { client, handler } from "../index";
import { Command } from "../interfaces/Command";
import { CacheType, Message, ActionRowBuilder, EmbedBuilder, ChatInputApplicationCommandData, CommandInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, TextChannel } from "discord.js";

/**
 * DB
 * const GDB = await QDB.get(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 */

/** help 명령어 */
export default class implements Command {
  /** 해당 명령어 설명 */
  name = "help";
  visible = true;
  description = "명령어 확인";
  information = "명령어 확인";
  aliases: string[] = [ "도움말" ];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description
  };

  /** 실행되는 부분 */
  async slashrun(interaction: CommandInteraction) {
    return await interaction.followUp(this.gethelp());
  }
  async messageRun(message: Message) {
    return (message.channel as TextChannel).send(this.gethelp()).then(m => client.msgdelete(m, 5));
  }
  async menurun(interaction: StringSelectMenuInteraction<CacheType>, args: string[]) {
    const command = handler.commands.get(args[0]);
    var embed = client.mkembed({  });
    var embed2: EmbedBuilder | undefined = undefined;
    if (command) {
      embed.setTitle(`\` /${args[0]} 도움말 \``)
        .setDescription(`이름: ${args[0]}\n설명: ${command.information ? command.information : command.description}`);
      embed2 = client.help(command.metadata.name, command.metadata, command.msgmetadata);
    } else {
      embed.setTitle(`\` ${args[0]} 도움말 \``)
        .setDescription(`명령어를 찾을수 없습니다.`)
        .setFooter({ text: `도움말: /help` })
        .setColor('DarkRed');
    }
    if (embed2) return await interaction.followUp({ embeds: [ embed, embed2 ] });
    return await interaction.followUp({ embeds: [ embed ] });
  }

  gethelp(): { embeds: EmbedBuilder[], components: ActionRowBuilder<StringSelectMenuBuilder>[] } {
    const slashcmdembed = client.mkembed({
      title: `\` slash (/) 도움말 \``,
      description: `명령어\n명령어 설명`
    });
    const msgcmdembed = client.mkembed({
      title: `\` 기본 (${client.prefix}) 도움말 \``,
      description: `명령어 [같은 명령어]\n명령어 설명`,
      footer: { text: `PREFIX: ${client.prefix}` }
    });
    let cmdlist: { label: string, description: string, value: string }[] = [];
    handler.commands.forEach((cmd) => {
      if (cmd.slashRun && cmd.visible) {
        cmdlist.push({ label: `/${cmd.name}`, description: `${cmd.information ? cmd.information : cmd.description}`, value: `${cmd.name}` });
        slashcmdembed.addFields([{ name: `**/${cmd.name}**`, value: `${cmd.information ? cmd.information : cmd.description ? cmd.description : "-"}`, inline: true }]);
      }
    });
    handler.commands.forEach((cmd) => {
      if (cmd.messageRun && cmd.visible) {
        // cmdlist.push({ label: `${client.prefix}${cmd.metadata.name} [${(cmd.metadata.aliases) ? cmd.metadata.aliases : ''}]`, description: `${cmd.metadata.description}`, value: `${cmd.metadata.name}` });
        msgcmdembed.addFields([{ name: `**${client.prefix}${cmd.name}${(cmd.aliases && cmd.aliases.length > 0) ? ` [ ${cmd.aliases} ]` : ""}**`, value: `${cmd.information ? cmd.information : cmd.description ? cmd.description : "-"}`, inline: true }]);
      }
    });
    const rowhelp = client.mkembed({
      title: '\` 명령어 상세보기 \`',
      description: `명령어의 자세한 내용은\n아래의 선택박스에서 선택해\n확인할수있습니다.`,
      footer: { text: '여러번 가능' }
    });
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help')
        .setPlaceholder('명령어를 선택해주세요.')
        .addOptions(cmdlist)
    );
    return { embeds: [ slashcmdembed, msgcmdembed, rowhelp ], components: [ row ] };
  }
}