import "dotenv/config";
import { ApplicationCommandOptionType, ChatInputApplicationCommandData, Client, ClientEvents, ColorResolvable, EmbedBuilder, EmbedField, Guild, Message } from "discord.js";
import { Consts } from "../config/consts";
import { Quiz } from "../quiz/quizClass";
// import { Logger } from "../utils/Logger";

export class BotClient extends Client {
  public debug: boolean;
  public prefix: string;
  public embedColor: ColorResolvable;
  public quiz: Map<string, Quiz>;
  public cooldowntime: number;
  public sleep: (ms: number) => Promise<void>;

  public constructor() {
    super({ intents: Consts.CLIENT_INTENTS });
    
    this.debug = JSON.parse(process.env.DEBUG || "false");
    this.prefix = process.env.PREFIX || "t;";

    this.embedColor = process.env.EMBED_COLOR
      ? process.env.EMBED_COLOR.trim().charAt(0).toLocaleUpperCase() + process.env.EMBED_COLOR.trim().slice(1).toLocaleLowerCase() as ColorResolvable
      : "Orange";
    this.sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    this.quiz = new Map();
    this.cooldowntime = 1250;

    this.login(process.env.DISCORD_TOKEN);
  }

  public readonly msgdelete = (message: Message, time: number, customtime?: boolean) => {
    let deletetime = customtime ? time : 6000 * time;
    if (deletetime < 100) deletetime = 100;
    setTimeout(() => {
      try {
        if (message.deletable) message.delete();
      } catch {};
    }, deletetime);
  }

  /**
   * 이벤트 핸들러 등록
   * 
   * 지정한 이벤트가 발생했을때 해당 핸들러를 호출함
   * * 'func'의 내용은 기본적으로 'client.on'을 따름
   * * 'extra'를 입력할 경우 추가되어 같이 전달
   * 
   * @example
   *    client.onEvent('ready', (client, info) => {
   *      Logger.ready(client?.user.username, '봇이 준비되었습니다.', info) // 출력: OOO 봇이 준비되었습니다. 추가 정보
   *    }, ['추가 정보']);
   * 
   * @param event 이벤트명
   * @param func 이벤트 핸들러 함수
   * @param extra 추가로 전달할 목록
   */
  public readonly onEvent = (event: keyof ClientEvents, func: Function, ...extra: any[]) => this.on(event, (...args) => func(...args, ...extra));

  public getqc = (guild: Guild): Quiz => {
    if (!this.quiz.has(guild.id)) this.quiz.set(guild.id, new Quiz(guild));
    return this.quiz.get(guild.id)!;
  }

  public mkembed(data: {
    title?: string,
    description?: string,
    url?: string,
    image?: string,
    thumbnail?: string,
    author?: { name: string, iconURL?: string, url?: string },
    addFields?: EmbedField[],
    timestamp?: number | Date | undefined | null,
    footer?: { text: string, iconURL?: string },
    color?: ColorResolvable
  }): EmbedBuilder {
    const embed = new EmbedBuilder();
    if (data.title) embed.setTitle(data.title);
    if (data.description) embed.setDescription(data.description);
    if (data.url) embed.setURL(data.url);
    if (data.image) embed.setImage(data.image);
    if (data.thumbnail) embed.setThumbnail(data.thumbnail);
    if (data.author) embed.setAuthor({ name: data.author.name, iconURL: data.author.iconURL, url: data.author.url });
    if (data.addFields) embed.addFields(data.addFields);
    if (data.timestamp) embed.setTimestamp(data.timestamp);
    if (data.footer) embed.setFooter({ text: data.footer.text, iconURL: data.footer.iconURL });
    if (data.color) {
      embed.setColor(data.color);
    } else {
      embed.setColor(this.embedColor);
    }
    return embed;
  }

  public help(name: string, metadata: ChatInputApplicationCommandData, msgmetadata?: { name: string, des: string }[]): EmbedBuilder | undefined {
    const prefix = this.prefix;
    var text = "";
    metadata.options?.forEach((opt) => {
      text += `/${name} ${opt.name}`;
      if (opt.type === ApplicationCommandOptionType.Subcommand && opt.options) {
        if (opt.options.length > 1) {
          text = "";
          opt.options.forEach((opt2) => {
            text += `/${name} ${opt.name} [${opt2.type}] : ${opt.description}\n`;
          });
        } else {
          text += ` [${opt.options[0].type}] : ${opt.description}\n`;
        }
      } else {
        text += ` : ${opt.description}\n`;
      }
    });
    if (msgmetadata) {
      text += `\n`;
      msgmetadata.forEach((opt) => {
        text += `${prefix}${name} ${opt.name} : ${opt.des}\n`;
      });
    }
    if (!text || text.length == 0) return undefined;
    return this.mkembed({
      title: `\` ${name} 명령어 \``,
      description: text,
      color: this.embedColor
    });
  }
}