import { client, handler } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js";
import { CacheType, Message, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu, SelectMenuInteraction } from "discord.js";
import MDB from "../database/Mongodb";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** help 명령어 */
export default class HelpCommand implements Command {
  /** 해당 명령어 설명 */
  name = "help";
  visible = true;
  description = "명령어 확인";
  information = "명령어 확인";
  aliases = [ "도움말" ];
  metadata = <D>{
    name: this.name,
    description: this.description
  };

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    return await interaction.editReply(this.gethelp());
  }
  async msgrun(message: Message, args: string[]) {
    return message.channel.send(this.gethelp()).then(m => client.msgdelete(m, 5));
  }
  async menurun(interaction: SelectMenuInteraction<CacheType>, args: string[]) {
    const command = handler.commands.get(args[0]);
    const embed = client.mkembed({ color: client.embedcolor });
    if (command) {
      embed.setTitle(`\` /${args[0]} \` 명령어`)
        .setDescription(`이름: ${args[0]}\n설명: ${command.information ? command.information : command.description}`)
        .setFooter(`도움말: /help`);
    } else {
      embed.setTitle(`\` ${args[0]} \` 명령어`)
        .setDescription(`명령어를 찾을수 없습니다.`)
        .setFooter(`도움말: /help`)
        .setColor('DARK_RED');
    }
    return await interaction.editReply({ embeds: [ embed ] });
  }

  gethelp(): { embeds: MessageEmbed[], components: MessageActionRow[] } {
    const slashcmdembed = client.mkembed({
      title: `\` slash (/) \` 명령어`,
      description: `명령어\n명령어 설명`,
      color: client.embedcolor
    });
    const msgcmdembed = client.mkembed({
      title: `\` 기본 (${client.prefix}) \` 명령어`,
      description: `명령어 [같은 명령어]\n명령어 설명`,
      footer: { text: `PREFIX: ${client.prefix}` },
      color: client.embedcolor
    });
    let cmdlist: { label: string, description: string, value: string }[] = [];
    handler.commands.forEach((cmd) => {
      if (cmd.slashrun && cmd.visible) {
        cmdlist.push({ label: `/${cmd.name}`, description: `${cmd.information ? cmd.information : cmd.description}`, value: `${cmd.name}` });
        slashcmdembed.addField(`**/${cmd.name}**`, `${cmd.information ? cmd.information : cmd.description ? cmd.description : "-"}`, true);
      }
    });
    handler.commands.forEach((cmd) => {
      if (cmd.msgrun && cmd.visible) {
        // cmdlist.push({ label: `${client.prefix}${cmd.metadata.name} [${(cmd.metadata.aliases) ? cmd.metadata.aliases : ''}]`, description: `${cmd.metadata.description}`, value: `${cmd.metadata.name}` });
        msgcmdembed.addField(`**${client.prefix}${cmd.name}${(cmd.aliases && cmd.aliases.length > 0) ? ` [ ${cmd.aliases} ]` : ""}**`, `${cmd.information ? cmd.information : cmd.description ? cmd.description : "-"}`, true);
      }
    });
    const rowhelp = client.mkembed({
      title: '\` 명령어 상세보기 \`',
      description: `명령어의 자세한 내용은\n아래의 선택박스에서 선택해\n확인할수있습니다.`,
      footer: { text: '여러번 가능' },
      color: client.embedcolor
    });
    const row = new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setCustomId('help')
        .setPlaceholder('명령어를 선택해주세요.')
        .addOptions(cmdlist)
    );
    return { embeds: [ slashcmdembed, msgcmdembed, rowhelp ], components: [ row ] };
  }
}