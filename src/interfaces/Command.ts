import { ButtonInteraction, ChatInputApplicationCommandData, CommandInteraction, Message, StringSelectMenuInteraction } from "discord.js";

export interface Command {
  name: string;
  visible: boolean;
  description: string;
  information: string;
  aliases: string[];
  metadata: ChatInputApplicationCommandData;
  msgmetadata?: { name: string, des: string }[];
  slashRun?: (args: CommandInteraction) => Promise<any>;
  messageRun?: (message: Message, args: string[]) => Promise<any>;
  menuRun?: (interaction: StringSelectMenuInteraction, args: string[]) => Promise<any>;
  buttonRun?: (interaction: ButtonInteraction, args: string[]) => Promise<any>;
}