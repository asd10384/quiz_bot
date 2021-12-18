import { ApplicationCommandData, Collection, CommandInteraction, Message } from 'discord.js';
import { readdirSync } from 'fs';
import _ from '../consts';
import BotClient from './BotClient';
import { Command } from '../interfaces/Command';
import { client } from '../index';
import MDB from "../database/Mongodb";
import quiz_anser from '../quiz/anser';
import { quiz_skip } from '../quiz/skip';
import { quiz_hint } from '../quiz/hint';

export const quizanser: Set<string> = new Set();

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

  public runCommand (interaction: CommandInteraction) {
    const commandName = interaction.commandName;
    const command = this.commands.get(commandName);

    if (!command) return;
    if (command.slashrun) command.slashrun(interaction);
  }
  
  public msgrunCommand (message: Message) {
    if (message.author.bot || message.channel.type === 'DM') return;
    if (message.content.startsWith(client.prefix)) {
      const content = message.content.slice(client.prefix.length).trim();
      const args = content.split(/ +/g);
      const commandName = args.shift()?.toLowerCase();
      const command = this.commands.get(commandName!) || this.commands.find((cmd) => cmd.aliases.includes(commandName!));
      try {
        if (!command || !command.msgrun) return this.err(message, commandName);
        command.msgrun(message, args);
      } catch(error) {
        if (client.debug) console.log(error); // 오류확인
        this.err(message, commandName);
      } finally {
        client.msgdelete(message, 350, true);
      }
    } else {
      return MDB.get.guild(message).then((guildID) => {
        if (guildID!.channelId === message.channelId) {
          const quizDB = client.quizdb(message.guildId!);
          if (quizDB.playing) {
            const text = message.content.trim().replace(/ +/g, " ").toLowerCase();
            if (text === "스킵" || text === "skip") return quiz_skip(message, message.author.id);
            if (text === "힌트" || text === "hint") return quiz_hint(message, message.author.id);
            if (text === quizDB.nowplaying?.name.toLowerCase() && quizanser.has(message.guildId!)) {
              quizanser.add(message.guildId!);
              return quiz_anser(message, [], message.author.id);
            }
          } else {
            client.msgdelete(message, 350, true);
            const command = this.commands.get("퀴즈");
            if (command && command.msgrun) return command.msgrun(message, message.content.trim().split(/ +/g));
          }
        }
      });
    }
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