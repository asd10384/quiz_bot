import { Interaction } from "discord.js";
import { handler } from "..";

export const onInteractionCreate = async (interaction: Interaction) => {
  if (interaction.isStringSelectMenu()) {
    await interaction.deferReply({ ephemeral: true, fetchReply: true }).catch(() => {});
    const commandName = interaction.customId;
    const args = interaction.values;
    const command = handler.commands.get(commandName);
    if (command && command.menuRun) return command.menuRun(interaction, args);
  }
  
  if (interaction.isButton()) {
    const args = interaction.customId.split("-");
    if (!args || args.length === 0) return;
    await interaction.deferReply({ ephemeral: true, fetchReply: true });
    const command = handler.commands.get(args.shift()!);
    if (command && command.buttonRun) return command.buttonRun(interaction, args);
  }

  if (!interaction.isCommand()) return;

  /**
   * 명령어 친사람만 보이게 설정
   * ephemeral: true
   */
  await interaction.deferReply({ ephemeral: true, fetchReply: true });
  handler.runCommand(interaction);
}