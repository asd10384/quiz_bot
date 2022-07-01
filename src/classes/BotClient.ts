import "dotenv/config";
import { ChatInputApplicationCommandData, Client, ClientEvents, ColorResolvable, EmbedFieldData, Guild, Message, MessageEmbed } from 'discord.js';
import _ from '../consts';
import Quiz from "../quiz/quizClass";

/**
 * 봇 클라이언트
 * 
 * 토큰, 세션관리 및 이벤트 레지스트리를 담당
 * * Disocrd.js Client의 확장
 * * 샤딩 지원
 */
export default class BotClient extends Client {
  debug: boolean;
  prefix: string;
  msgdelete: (m: Message, deletetime: number, customtime?: boolean) => void;
  deletetime: number;
  ttsfilepath: string;
  ttstimer: Map<string, { start: boolean, time: number }>;
  ttstimertime: number;
  embedcolor: ColorResolvable;
  maxqueue: number;
  quiz: Map<string, Quiz>;
  cooldowntime: number;
  /**
   * 클라이언트 생성
   * 
   * 환경변수를 읽고 해당 토큰을 사용해 클라이언트 생성
   */
  public constructor() {
    super({ intents: _.CLIENT_INTENTS });

    if (!process.env.DISCORD_TOKEN) {
      throw new Error('.env 파일에 DISOCRD_TOKEN이 없음.');
    }
    this.debug = JSON.parse(process.env.DEBUG!);
    this.token = process.env.DISCORD_TOKEN!;
    this.prefix = process.env.PREFIX || 'm;';
    this.login();
    this.deletetime = 6000; //초
    this.ttsfilepath = (process.env.TTS_FILE_PATH) ? (process.env.TTS_FILE_PATH.endsWith('/')) ? process.env.TTS_FILE_PATH : process.env.TTS_FILE_PATH+'/' : '';
    this.msgdelete = (message: Message, time: number, customtime?: boolean) => {
      let dtime = (customtime) ? time : this.deletetime * time;
      if (dtime < 100) dtime = 100;
      setTimeout(() => {
        try {
          message.delete().catch(() => {});
        } catch {}
      }, dtime);
    };
    this.ttstimer = new Map<string, { start: boolean, time: number }>();
    this.ttstimertime = (60) * 45; //분
    this.embedcolor = process.env.EMBED_COLOR ? process.env.EMBED_COLOR as ColorResolvable : "ORANGE";
    this.maxqueue = 30;
    this.quiz = new Map();
    this.cooldowntime = 1250;
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
   *      console.log(client?.user.username, '봇이 준비되었습니다.', info) // 출력: OOO 봇이 준비되었습니다. 추가 정보
   *    }, ['추가 정보']);
   * 
   * @param event 이벤트명
   * @param func 이벤트 핸들러 함수
   * @param extra 추가로 전달할 목록
   */
  public onEvent = (event: keyof ClientEvents, func: Function, ...extra: any[]) => this.on(event, (...args) => func(...args, ...extra));

  public getqc = (guild: Guild): Quiz => {
    if (!this.quiz.has(guild.id)) this.quiz.set(guild.id, new Quiz(guild));
    return this.quiz.get(guild.id)!;
  }

  mkembed(data: {
    title?: string,
    description?: string,
    url?: string,
    image?: string,
    thumbnail?: string,
    author?: { name: string, iconURL?: string, url?: string },
    addField?: { name: string, value: string, inline?: boolean },
    addFields?: EmbedFieldData[],
    timestamp?: number | Date | undefined | null,
    footer?: { text: string, iconURL?: string },
    color?: ColorResolvable
  }): MessageEmbed {
    const embed = new MessageEmbed().setColor(this.embedcolor);
    if (data.title) embed.setTitle(data.title);
    if (data.description) embed.setDescription(data.description);
    if (data.url) embed.setURL(data.url);
    if (data.image) embed.setImage(data.image);
    if (data.thumbnail) embed.setThumbnail(data.thumbnail);
    if (data.author) embed.setAuthor(data.author.name, data.author.iconURL, data.author.url);
    if (data.addField) embed.addField(data.addField.name, data.addField.value, data.addField.inline);
    if (data.addFields) embed.addFields(data.addFields);
    if (data.timestamp) embed.setTimestamp(data.timestamp);
    if (data.footer) embed.setFooter({ text: data.footer.text, iconURL: data.footer.iconURL });
    if (data.color) embed.setColor(data.color);
    return embed;
  }


  help(name: string, metadata: ChatInputApplicationCommandData, msgmetadata?: { name: string, des: string }[]): MessageEmbed | undefined {
    const prefix = this.prefix;
    var text = "";
    metadata.options?.forEach((opt) => {
      text += `/${name} ${opt.name}`;
      if (opt.type === "SUB_COMMAND" && opt.options) {
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
      color: this.embedcolor
    });
  }
}