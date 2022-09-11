import { client, handler } from '../index';
import { ButtonInteraction, CommandInteraction, Interaction, SelectMenuInteraction } from 'discord.js';

export default async function onInteractionCreate (interaction: Interaction) {
  if (interaction.isSelectMenu()) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const commandName = interaction.customId;
    const args = interaction.values;
    const command = handler.commands.get(commandName);
    if (command && command.menurun) return command.menurun(interaction, args);
  }
  if (interaction.isButton()) {
    const args = interaction.customId.split("-");
    if (!args || args.length === 0) return;
    await deferReply(interaction);
    const command = handler.commands.get(args.shift()!);
    if (command && command.buttonrun) return command.buttonrun(interaction, args);
  }
  if (!interaction.isCommand()) return;
  await deferReply(interaction);
  
  const commandName = interaction.commandName;
  const command = handler.commands.get(commandName);

  if (!command) return;
  if (command.slashrun) command.slashrun(interaction);
}

async function deferReply(interaction: CommandInteraction | SelectMenuInteraction | ButtonInteraction): Promise<any> {
  /**
   * 명령어 친사람만 보이게 설정
   * ephemeral: true
   */
  return await (interaction).deferReply({ ephemeral: true }).catch(() => {});
}