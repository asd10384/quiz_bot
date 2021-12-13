import { ChatInputApplicationCommandData, CommandInteraction, Message, SelectMenuInteraction } from "discord.js";

export interface Command {
  name: string;
  visible: boolean;
  description: string;
  information: string;
  aliases: string[];
  metadata: ChatInputApplicationCommandData;
  slashrun?: (args: CommandInteraction) => Promise<any>;
  msgrun?: (message: Message, args: string[]) => Promise<any>;
  menurun?: (interaction: SelectMenuInteraction, args: string[]) => Promise<any>;
}