import { ApplicationCommandData, Collection, CommandInteraction, Message } from 'discord.js';
import { readdirSync } from 'fs';
import _ from '../consts';
import BotClient from './BotClient';
import { Command } from '../interfaces/Command';
import { client } from '../index';

export default class SlashHandler {
  public commands: Collection<string, Command>;
  public cooldown: { [key: string]: number };

  constructor () {
    this.commands = new Collection();
    this.cooldown = {};

    const commandPath = _.COMMANDS_PATH;
    const commandFiles = readdirSync(commandPath);

    for (const commandFile of commandFiles) {
      // eslint-disable-next-line new-cap
      const command = new (require(_.COMMAND_PATH(commandFile)).default)() as Command;

      this.commands.set(command.metadata.name, command);
    }
  }

  public async registCachedCommands (client: BotClient): Promise<void> {
    if (!client.application) return console.warn('WARNING: registCachedCommands() called before application is ready.');

    const metadatas = [] as ApplicationCommandData[];
    for (const command of this.commands.values()) {
      if (!command.metadata) continue;
      if (!command.visible || !command.slashrun) continue;
      metadatas.push(command.metadata);
    }

    if (process.env.ENVIROMENT?.toUpperCase() === 'DEV') {
      await client.application.commands.set([], process.env.ENVIROMENT_DEV_GUILD!);
      await client.application.commands.set(metadatas, process.env.ENVIROMENT_DEV_GUILD!);

      console.log('Registered commands for guild:', process.env.ENVIROMENT_DEV_GUILD!);
      return;
    }

    await client.application.commands.set([]);
    await client.application.commands.set(metadatas);
    console.log('Registered commands.');
  }

  err(message: Message, commandName: string | undefined | null) {
    if (!commandName || commandName == '') return;
    return message.channel.send({ embeds: [
      client.mkembed({
        description: `\` ${commandName} \` 이라는 명령어를 찾을수 없습니다.`,
        footer: { text: ` ${client.prefix}help 를 입력해 명령어를 확인해주세요.` },
        color: "DARK_RED"
      })
    ] }).then(m => client.msgdelete(m, 1));
  }
}