import { client, handler } from '..';
import { Interaction } from 'discord.js';

export default async function onInteractionCreate (interaction: Interaction) {
  if (interaction.isSelectMenu()) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const commandName = interaction.customId;
    const args = interaction.values;
    const command = handler.commands.get(commandName);
    if (command && command.menurun) return command.menurun(interaction, args);
  }
  if (!interaction.isCommand()) return;

  /**
   * 명령어 친사람만 보이게 설정
   * ephemeral: true
   */
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  handler.runCommand(interaction);
}