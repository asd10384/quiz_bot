import { GatewayIntentBits } from "discord.js";
import { join } from "path";

export class Consts {
  // 권한 추가
  public static readonly CLIENT_INTENTS: GatewayIntentBits[] = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent
  ];

  // 명령어 폴더
  public static readonly COMMANDS_PATH = join(__dirname, "..", 'commands');
  // 명령어 폴더 + 파일이름
  public static readonly COMMAND_PATH = (commandFile: string) => join(this.COMMANDS_PATH, commandFile);
}