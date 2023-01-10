import "dotenv/config";
import { client } from "..";
import { DefaultRestOptions, REST, Routes } from "discord.js";
import { Consts } from "../config/consts";
import { ApplicationCommandData, Collection, CommandInteraction, Message } from "discord.js";
import { Command } from "../interfaces/Command";
import { readdirSync } from "fs";
import { BotClient } from "./BotClient";
import { Logger } from "../utils/Logger";

export class SlashHandler {
  public commands: Collection<string, Command>;
  public cooldown: Map<string, number>;

  public constructor() {
    this.commands = new Collection();
    this.cooldown = new Map();

    const commandPath = Consts.COMMANDS_PATH;
    const commandFiles = readdirSync(commandPath);

    for (const commandFile of commandFiles) {
      const command = new (require(Consts.COMMAND_PATH(commandFile)).default)() as Command;

      this.commands.set(command.metadata.name, command);
    }
  }

  public async registCachedCommands(client: BotClient) {
    if (!process.env.DISCORD_CLIENTID) {
      throw new TypeError("DISCORD_CLIENTID을 찾을수 없음");
    }
    if (!process.env.DISCORD_TOKEN) {
      throw new TypeError("DISCORD_TOKEN을 찾을수 없음");
    }
    
    if (!client.application) return Logger.warn('WARNING: registCachedCommands() called before application is ready.');

    const metadatas = [] as ApplicationCommandData[];
    for (const command of this.commands.values()) {
      if (!command.metadata) continue;
      if (!command.visible || !command.slashRun) continue;
      metadatas.push(command.metadata);
    }

    const rest = new REST({ version: DefaultRestOptions.version }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENTID),
      { body: [] }
    ).then(() => Logger.debug('Successfully deleted commands.'));

    if (process.env.ENVIROMENT?.toUpperCase() === 'DEV') {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENTID, process.env.ENVIROMENT_DEV_GUILDID!),
        { body: [] }
      ).then(() => Logger.debug("Successfully deleted commands for guild: " + process.env.ENVIROMENT_DEV_GUILDID!));
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENTID, process.env.ENVIROMENT_DEV_GUILDID!),
        { body: metadatas }
      ).then(() => Logger.debug('Registered commands for guild: ' + process.env.ENVIROMENT_DEV_GUILDID!));
      return;
    }

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENTID),
      { body: metadatas }
    ).then(() => Logger.debug('Registered commands.'));
  }

  public runCommand (interaction: CommandInteraction) {
    const commandName = interaction.commandName;
    const command = this.commands.get(commandName);

    if (!command) return;
    if (command.slashRun) command.slashRun(interaction);
  }

  err(message: Message, commandName: string | undefined | null) {
    if (!commandName || commandName == '') return;
    return message.channel.send({ embeds: [
      client.mkembed({
        description: `\` ${commandName} \` 이라는 명령어를 찾을수 없습니다.`,
        footer: { text: ` ${client.prefix}help 를 입력해 명령어를 확인해주세요.` },
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
  }
}