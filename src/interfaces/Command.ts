import { ButtonInteraction, ChatInputApplicationCommandData, CommandInteraction, Message, SelectMenuInteraction } from "discord.js";

export interface Command {
  name: string;
  visible: boolean;
  description: string;
  information: string;
  aliases: string[];
  metadata: ChatInputApplicationCommandData;
  msgmetadata?: { name: string, des: string }[];
  slashrun?: (args: CommandInteraction) => Promise<any>;
  msgrun?: (message: Message, args: string[]) => Promise<any>;
  menurun?: (interaction: SelectMenuInteraction, args: string[]) => Promise<any>;
  buttonrun?: (interaction: ButtonInteraction, args: string[]) => Promise<any>;
}