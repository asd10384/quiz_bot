import "dotenv/config";
import { client } from "../index";
import { I, M, PM } from "aliases/discord.js";
import { Guild, EmbedBuilder, StageChannel, TextChannel, VoiceChannel, ChannelType } from "discord.js";
import QDB, { qdbdata } from "../database/Quickdb";
import request from "request";
import { CheerioAPI, load } from "cheerio";
import { fshuffle } from "./shuffle";
import { QUIZ_RULE } from "../config";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import { getuserchannel, getbotchannel } from "./getChannel";
import ytdl from "ytdl-core";
import internal from "stream";
import { HttpsProxyAgent } from "https-proxy-agent";
import { dataswitch } from "./page";
const sleep = (t: number) => new Promise(r => setTimeout(r, t));

const proxy = process.env.PROXY;
let agent: HttpsProxyAgent | undefined = undefined;
if (proxy) {
  agent = new HttpsProxyAgent(proxy);
} else {
  console.error("proxy를 찾을수 없음");
}

export const MUSIC_SITE = process.env.MUSIC_SITE ? process.env.MUSIC_SITE.trim().endsWith("/") ? process.env.MUSIC_SITE.trim().slice(0,-1) : process.env.MUSIC_SITE.trim() : "";
const LOGCHANNEL = process.env.LOGCHANNEL ? process.env.LOGCHANNEL.trim().replace(/ +/g,"").split(",") : undefined;

export interface page_data {
  url: string;
  desc: string;
  quiz: "음악퀴즈" | "그림퀴즈" | "";
  customimg: boolean;
  space: boolean;
  complite: number;
  start: boolean;
};

export interface page {
  [key: string]: {
    [key: string]: {
      [key: string]: page_data;
    }
  }
};

export interface nowplay {
  name: string;
  vocal: string;
  link: string;
  realnumber: number;
};

type gethtmlsite = { name: string, vocal: string, link: string; realnumber: number; };

type score = { Id: string, count: number };

interface quizpage {
  start: string;
  page: string[];
  list: string[];
  nowpage: number;
  end: boolean;
  go: boolean;
  nownummax: [ number, number ];
};
interface quizpagecheck {
  start?: string;
  page?: string[];
  list?: string[];
  nowpage?: number;
  end?: boolean;
  go?: boolean;
  nownummax?: [ number, number ];
};

export default class Quiz {
  cooldown: number;
  guild: Guild;
  playing: boolean;
  nowplaying: nowplay;
  queue: nowplay[];
  page: quizpage;
  scoredata: score[];
  cananser: boolean;
  nextplaycanstop: boolean;
  playquiztype: page_data;
  anserdata: [ string, string ];
  count: [ number, number ];
  lastPlayer?: AudioPlayer;
  skipdata: {
    list: string[];
    can: boolean;
  };
  hintdata: {
    list: string[];
    can: boolean;
    already: boolean;
  };

  constructor(guild: Guild) {
    this.guild = guild;
    this.cooldown = 0;
    this.playing = false;
    this.nextplaycanstop = true;
    this.nowplaying = {
      realnumber: 0,
      name: "",
      vocal: "",
      link: ""
    }
    this.queue = [];
    this.page = {
      start: "",
      page: [],
      list: [],
      nowpage: 0,
      end: false,
      go: false,
      nownummax: [ 0, 0 ]
    };
    this.playquiztype = {
      complite: 0,
      customimg: false,
      desc: "",
      quiz: "",
      space: false,
      start: false,
      url: ""
    };
    this.scoredata = [];
    this.anserdata = [ "", "" ];
    this.count = [ 0, 0 ];
    this.cananser = false;
    this.skipdata = {
      list: [],
      can: false
    };
    this.hintdata = {
      list: [],
      can: false,
      already: false
    };
  }

  setcooldown(getcooldown: number) {
    this.cooldown = getcooldown;
  }

  setqueue(getqueue: nowplay[]) {
    this.queue = getqueue;
  }

  setcananser(getcananser: boolean) {
    this.cananser = getcananser;
  }

  setpage(opt: quizpagecheck) {
    if (opt.start) this.page.start = opt.start;
    if (opt.end) this.page.end = opt.end;
    if (opt.nownummax) this.page.nownummax = opt.nownummax;
    if (opt.list) this.page.list = opt.list;
    if (opt.nowpage) this.page.nowpage = opt.nowpage;
    if (opt.page) this.page.page = opt.page;
    if (opt.go) this.page.go = opt.go;
  }

  async bulkmessage(guild: Guild) {
    const guildDB = await QDB.get(guild);
    const channel = guild.channels.cache.get(guildDB.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    try {
      await (channel as TextChannel).messages.fetch({ after: guildDB.scoreId, cache: true }).then(async (ms) => {
        if (ms.size > 0) await (channel as TextChannel).bulkDelete(ms.size).catch(() => {});
      });
    } catch {};
  }
  
  async stop(guild: Guild, no?: boolean) {
    const guildDB = await QDB.get(guild);
    if (!no) await this.bulkmessage(guild);
    const channel = guild.channels.cache.get(guildDB.channelId);
    if (channel?.type === ChannelType.GuildText) {
      const msg = (channel as TextChannel).messages.cache.get(guildDB.msgId);
      msg?.reactions.removeAll();
    }
    this.playing = false;
    this.queue = [];
    this.nowplaying = {
      name: "",
      vocal: "",
      link: "",
      realnumber: 0
    };
    this.page = {
      start: "",
      end: false,
      go: false,
      list: [],
      page: [],
      nownummax: [ 0, 0 ],
      nowpage: 0,
    };
    this.scoredata = [];
    this.cananser = false;
    this.reset_skip(false);
    this.reset_hint(false);
    this.setmsg(guild);
    getVoiceConnection(guild.id)?.disconnect();
  }

  setmsg(guild: Guild, anser_user?: string, time?: number) {
    setTimeout(() => {
      QDB.get(guild).then((guildDB) => {
        if (guildDB) {
          let text = `${this.setlist(guildDB)}`;
          let embed = this.setembed(guildDB, anser_user, time);
          const channel = guild.channels.cache.get(guildDB.channelId);
          if (channel && channel.type === ChannelType.GuildText) (channel as TextChannel).messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] }).catch((err) => {});
        }
      }).catch((err) => {});
    }, 50);
  }

  setlist(guildDB: qdbdata): string {
    if (this.playing) {
      return `퀴즈를 종료하시려면 \` ${client.prefix}퀴즈 종료 \`를 입력해주세요.
  퀴즈가 진행되지 않거나 오류가 발생했을때 \` ${client.prefix}퀴즈 fix \`를 입력해주세요.
  힌트를 받으시려면 \`힌트 \`를 입력하거나 💡를 눌러주세요.
  문제를 스킵하시려면 \` 스킵 \`을 입력하거나 ⏭️을 눌러주세요.\nㅤ`;
    } else {
      return `${QUIZ_RULE(guildDB)}ㅤ`;
    }
  }

  setembed(guildDB: qdbdata, anser_user?: string, time?: number): EmbedBuilder {
    let data = this.nowplaying!;
    let embed = client.mkembed({
      footer: { text: `${client.prefix}퀴즈 도움말` }
    });
    if (this.playing) {
      if (this.anserdata[0].length > 0) {
        embed.setTitle(`**정답 : ${data.name}**`)
          .setURL(data.link)
          .setDescription(`
            **가수 : ${data.vocal}**
            **정답자 : ${anser_user ? anser_user : `<@${this.anserdata[0]}>`}**
            **[ ${this.count[0]-1} / ${this.count[1]} ]**
          `)
          .setImage(this.anserdata[1])
          .setFooter({ text: `${time ? time : 15}초 뒤에 다음문제로 넘어갑니다.` });
      } else {
        embed.setTitle(`**정답 : ???**`)
          .setDescription(`
            **가수 : ???**
            **정답자 : ???**
            **[ ${this.count[0]} / ${this.count[1]} ]**
          `)
          .setImage(`https://ytms.netlify.app/question_mark.png`);
      }
    } else {
      embed.setTitle(`**현재 퀴즈가 시작되지 않았습니다.**`)
        .setDescription(`**정답설정 : ${guildDB.options.anser}**\n**다음문제시간 : ${guildDB.options.nexttime}초**`)
        .setImage(`https://ytms.netlify.app/defult.png`);
    }
    return embed;
  }

  async getsite(): Promise<page> {
    return new Promise((res, rej) => {
      request.get(`${MUSIC_SITE}/music_list.js`, (err, res2, body) => {
        if (err || !body) return rej(err);
        const data: page = eval(body)[0];
        return res(data);
      });
    });
  }
  async setquiz_getsite(url: string): Promise<CheerioAPI> {
    return new Promise((res, rej) => {
      request.get(encodeURI(url.toLowerCase()), (err, res2, html) => {
        if (err || !html) return rej(err);
        return res(load(html));
      });
    });
  }

  async start(message: M | PM, userId: string) {
    if (MUSIC_SITE.length === 0) return message.channel.send({ embeds: [ client.mkembed({
      title: `사이트를찾을수없음`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 2));
    const guildDB = await QDB.get(message.guild!);
    const channel = client.channels.cache.get(guildDB.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return message.channel.send({ embeds: [ client.mkembed({
      title: `퀴즈 채널을 찾을수 없습니다.`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 2));
    const msg = (channel as TextChannel).messages.cache.get(guildDB.msgId);
    if (!msg) return message.channel.send({ embeds: [ client.mkembed({
      title: `퀴즈 채널에 임베드를 찾을수 없습니다.`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 2));
    const data: page | undefined = await this.getsite().catch((err) => {
      if (client.debug) console.log(err);
      return undefined;
    });
    if (!data) return message.channel.send({ embeds: [ client.mkembed({
      title: `사이트 불러오기오류`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 2));
    if (this.page.start.length === 0) {
      this.page.start = userId;
      msg.reactions.removeAll();
      msg.react('⬅️');
      msg.react('1️⃣');
      msg.react('2️⃣');
      msg.react('3️⃣');
      msg.react('4️⃣');
      msg.react('5️⃣');
      msg.react('↩️');
      msg.react('➡️');
    }

    if (this.page.end) {
      if (this.page.go) {
        let getvalue = data[this.page.page[0]][this.page.page[1]][this.page.page[2]];
        this.playquiztype = getvalue;
        msg?.reactions.removeAll();
        msg?.react("💡");
        msg?.react("⏭️");
        return this.setquiz(message, getvalue, userId);
      } else {
        this.page.end = false;
        this.page.go = false;
        this.page.page = this.page.page.slice(0,-2);
      }
    }

    let list: string[] = [];
    const get = dataswitch(this.page.page, data);
    this.page.list = get.getlist;
    const embed = client.mkembed({
      footer: { text: `아래 이모지가 다 생성된뒤 눌러주세요.` }
    });
    if (get.getvalue) {
      embed.setTitle(`**${this.page.page.join("/") ? this.page.page.join("/") : "퀴즈"}**`)
        .setDescription(`
          **이름**: ${this.page.page[this.page.page.length-1]}
          **형식**: ${get.getvalue.quiz}
          **설명**: ${get.getvalue.desc}
          **완성도**: ${(get.getvalue.complite === 100) ? "완성" : (get.getvalue.complite === 0) ? "미완성" : `${get.getvalue.complite}%`}
          
          1️⃣ 시작하기
          2️⃣ 뒤로가기
        `);
      this.page.end = true;
    } else {
      for (let i=0; i<get.getlist.length; i++) {
        let key = get.getlist[i];
        if (!list[Math.floor(i / 5)]) list[Math.floor(i / 5)] = "";
        list[Math.floor(i / 5)] += `${bignum((i % 5)+1)}  ${key}\n`;
      }
      embed.setTitle(`**${this.page.page.join("/") ? this.page.page.join("/") : "퀴즈"}**`)
        .setDescription(`${list[this.page.nowpage]}\n**[** 페이지 **:** ${this.page.nowpage+1} **/** ${list.length} **]**`);
      this.page.nownummax = [ get.getlist.length, list.length-1 < 0 ? 0 : list.length-1 ];
    }
    msg.edit({
      content: `${QUIZ_RULE(guildDB!)}ㅤ`,
      embeds: [ embed ]
    });
  }
  
  async setquiz(message: M | PM, getvalue: page_data, userId: string) {
    const $ = await this.setquiz_getsite(getvalue.url).catch((err) => {
      if (client.debug) console.log(err);
      return undefined;
    });
    if (!$) {
      this.stop(message.guild!);
      await sleep(100);
      return message.channel.send({ embeds: [ client.mkembed({
        title: `오류발생`,
        description: `파일 불러오는중 오류발생`,
        color: "DarkRed"
      }) ] }).then(m => client.msgdelete(m, 1));
    }
    let first: gethtmlsite[] = [];
    $("body div.music div").each((i, el) => {
      first.push({
        name: ($(el).children("a.name").text().trim()),
        vocal: ($(el).children("a.vocal").text().trim()),
        link: ($(el).children("a.link").text().trim()),
        realnumber: 0
      });
    });
    let second: gethtmlsite[] = [];
    let count: number[] = [];
    count = Array.from(Array(first.length).keys());
    for (let i=0; i<3; i++) count = fshuffle(count);
    const maxcount = 100;
    let logtext = `${message.guild?.name} {\n`;
    for (let i=0; i<maxcount; i++) {
      if (!first[count[i]]?.name) continue;
      second.push({
        name: first[count[i]]!.name,
        vocal: first[count[i]]!.vocal,
        link: first[count[i]]!.link,
        realnumber: count[i]
      });
      logtext += `  ${i+1}. [${count[i]}] ${first[count[i]].vocal} - ${first[count[i]].name}\n`;
    }
    logtext += `}\n`;
    if (client.debug) console.log(logtext);
    if (LOGCHANNEL) this.sendlog(logtext);
    this.queue = second;
    this.count = [ 1, second.length ];
    if (this.playquiztype.quiz === "음악퀴즈") return this.music_quiz(message, userId);
    // if (this.playquiztype.quiz === "그림퀴즈") return this.img_quiz(message, userId);
    this.stop(message.guild!);
    await sleep(100);
    return message.channel.send({ embeds: [ client.mkembed({
      title: `퀴즈오류`,
      description: `퀴즈 타입을 찾을수없습니다.\n오류난 타입 : ${this.playquiztype.quiz}`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 1));
  }
  
  async music_quiz(message: M | PM, userId: string) {
    this.cananser = true;
    this.nextplaycanstop = true;
    this.lastPlayer?.stop();
    this.lastPlayer = undefined;
    var voicechannel: VoiceChannel | StageChannel | null | undefined = undefined;
    var connection = getVoiceConnection(message.guildId!);
    if (!connection) voicechannel = await getbotchannel(message.guild!);
    if (!connection && !voicechannel) voicechannel = getuserchannel(message.guild?.members.cache.get(userId));
    if (!connection && !voicechannel) return message.channel.send({ embeds: [
      client.mkembed({
        title: `\` 음성 오류 \``,
        description: `음성채널을 찾을수 없습니다.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (this.count[0] > this.count[1]) return this.stop(message.guild!);
    const data = this.queue.shift();
    if (!data) return this.stop(message.guild!);
    this.nowplaying = data;
    this.playing = true;
    this.anserdata[0] = "";
    this.anserdata[1] = (this.playquiztype.customimg) 
      ? `${process.env.MUSIC_SITE}/customimg/${this.page.page.slice(0,-1).join("/")}/${this.nowplaying?.name}.png`
      || `${process.env.MUSIC_SITE}/customimg/${this.page.page.slice(0,-1).join("/")}/${this.nowplaying?.name}.png`
      : `https://img.youtube.com/vi/${this.nowplaying?.link.replace("https://youtu.be/","")}/sddefault.jpg`;
    await this.bulkmessage(message.guild!);
    this.setmsg(message.guild!);
    this.checkmsg(message.guild!);
    if (!connection) connection = joinVoiceChannel({
      adapterCreator: message.guild!.voiceAdapterCreator! as DiscordGatewayAdapterCreator,
      channelId: voicechannel!.id,
      guildId: message.guildId!
    });
    const Player = createAudioPlayer();
    connection.setMaxListeners(0);
    Player.setMaxListeners(0);
    Player.on("error", (err) => {
      if (client.debug) console.log("Player 오류:", err);
      Player.stop();
      if (this.playquiztype.quiz === "음악퀴즈") return this.music_anser(message, ["스킵", "오류"], userId);
      // if (this.playquiztype.quiz === "그림퀴즈") return this.img_anser(message, ["스킵", "오류"], userId);
      return this.stop(message.guild!);
    });
    connection.on("error", (err) => {
      if (client.debug) console.log("connection 오류:", err);
      Player.stop();
      if (this.playquiztype.quiz === "음악퀴즈") return this.music_anser(message, ["스킵", "오류"], userId);
      // if (this.playquiztype.quiz === "그림퀴즈") return this.img_anser(message, ["스킵", "오류"], userId);
      return this.stop(message.guild!);
    });
    var checkvideo = await ytdl.getInfo(this.nowplaying.link, {
      lang: "KR",
      requestOptions: { agent }
    }).catch((err) => {
      checkvideo = undefined;
      return undefined;
    });
    if (!checkvideo) {
      Player.stop();
      if (this.playquiztype.quiz === "음악퀴즈") return this.music_anser(message, ["스킵", "오류"], userId);
      // if (this.playquiztype.quiz === "그림퀴즈") return this.img_anser(message, ["스킵", "오류"], userId);
      return this.stop(message.guild!);
    }
    var ytsource: internal.Readable | undefined = undefined;
    try {
      if (client.debug) console.log(`${message.guild?.name} {\n  get: ${this.page.page.slice(0,-1).join("/")}\n  number: ${this.count[0]}\n  realnumber: ${this.nowplaying.realnumber+1}\n  name: ${this.nowplaying.vocal}-${this.nowplaying.name}\n  link: ${this.nowplaying.link}\n}`);
      if (LOGCHANNEL) this.sendlog(`${message.guild?.name} {\n  get: ${this.page.page.slice(0,-1).join("/")}\n  number: ${this.count[0]}\n  realnumber: ${this.nowplaying.realnumber+1}\n  name: ${this.nowplaying.vocal}-${this.nowplaying.name}\n  link: ${this.nowplaying.link}\n}`);
      ytsource = ytdl(this.nowplaying.link, {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25,
        requestOptions: { agent }
      });
      ytsource.on("error", (err) => {
        if (client.debug) console.log('ytdl-core오류1:', err);
        ytsource = undefined;
        return undefined;
      });
    } catch(err) {
      ytsource = undefined;
    }
    if (!ytsource) {
      Player.stop();
      if (this.playquiztype.quiz === "음악퀴즈") return this.music_anser(message, ["스킵", "오류"], userId);
      // if (this.playquiztype.quiz === "그림퀴즈") return this.img_anser(message, ["스킵", "오류"], userId);
      return this.stop(message.guild!);
    }
    this.cananser = false;
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
    this.nextplaycanstop = false;
    const resource = createAudioResource(ytsource, {
      inlineVolume: true, inputType: StreamType.Arbitrary
    });
    resource.volume?.setVolume(0.5);
    Player.play(resource);
    this.lastPlayer = Player;
    const subscription = connection.subscribe(Player);
    this.reset_skip(true);
    this.reset_hint(true);
    Player.on(AudioPlayerStatus.Idle, async (p) => {
      if (ytsource && !this.nextplaycanstop) {
        Player.stop();
        if (this.playquiztype.quiz === "음악퀴즈") this.music_anser(message, ["스킵", "시간초과"], userId);
        // else if (this.playquiztype.quiz === "그림퀴즈") this.img_anser(message, ["스킵", "시간초과"], userId);
        else this.stop(message.guild!);
      }
    });
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.stop(message.guild!);
      connection?.disconnect();
    });
  }

  async music_anser(message: M | PM, args: string[], userId: string) {
    this.reset_skip(false);
    this.reset_hint(false);
    const guildDB = await QDB.get(message.guild!);
    var anser_user = `<@${userId}>`;
    if (args[0] === "스킵" || args[0] === "skip") {
      anser_user = (args[1] === '시간초과') 
        ? '시간 초과로 스킵되었습니다.' 
        : (args[1] === '관리자') 
        ? `<@${userId}> 님이 강제로 스킵했습니다.`
        : (args[1] === "오류")
        ? `노래 오류로 스킵되었습니다.`
        : '스킵하셨습니다.';
      if (this.scoredata.findIndex(v => v.Id === "skip") < 0) this.scoredata.push({ Id: "skip", count: 0 });
      this.scoredata[this.scoredata.findIndex(v => v.Id === "skip")] = {
        Id: "skip",
        count: this.scoredata[this.scoredata.findIndex(v => v.Id === "skip")].count += 1
      };
    } else {
      if (this.scoredata.findIndex(v => v.Id === message.author!.id) < 0) this.scoredata.push({ Id: message.author!.id, count: 0 });
      this.scoredata[this.scoredata.findIndex(v => v.Id === message.author!.id)] = {
        Id: message.author!.id,
        count: this.scoredata[this.scoredata.findIndex(v => v.Id === message.author!.id)].count += 1
      };
    }
    this.score(message.guild!);
    this.count[0] = this.count[0] + 1;
    this.anserdata[0] = userId;
    const time = guildDB.options.nexttime;
    this.setmsg(message.guild!, anser_user, time);
    await this.bulkmessage(message.guild!);
    setTimeout(() => {
      const vc = getVoiceConnection(message.guildId!);
      if (vc && this.playing && this.queue.length > 0) {
        try {
          this.music_quiz(message, userId);
        } catch {
          this.stop(message.guild!);
        }
      } else {
        this.stop(message.guild!);
      }
    }, time * 1000);
  }

  checkmsg(guild: Guild) {
    QDB.get(guild).then((guildDB) => {
      if (guildDB) {
        const channel = guild.channels.cache.get(guildDB.channelId);
        if (channel?.type === ChannelType.GuildText) {
          if (!(channel as TextChannel).messages.cache.get(guildDB.msgId) || !(channel as TextChannel).messages.cache.get(guildDB.scoreId)) {
            (channel as TextChannel).messages.fetch({ cache: true }).then(async (ms) => {
              if (ms.size > 0) await (channel as TextChannel).bulkDelete(ms.size).catch(() => {});
              const msg = await (channel as TextChannel).send({ content: "퀴즈오류해결중..." });
              const score = await (channel as TextChannel).send({ content: "스코어보드오류해결중..." });
              client.getqc(guild).sendlog(`${guild.name} {\n  err: 퀴즈오류 + 스코어보드오류 해결중\n}`);
              QDB.set(guild.id, { msgId: msg.id, scoreId: score.id }).then(() => {
                setTimeout(() => {
                  this.setmsg(guild);
                  this.score(guild);
                }, 600);
              }).catch((err) => {});
            }).catch((err) => {});
            return;
          }
        }
      }
    });
  }

  score(guild: Guild) {
    setTimeout(() => {
      QDB.get(guild).then((guildDB) => {
        if (guildDB) {
          const embed = this.setscoreembed();
          const channel = guild.channels.cache.get(guildDB.channelId);
          if (channel?.type === ChannelType.GuildText) {
            const scoremsg = (channel as TextChannel).messages.cache.get(guildDB.scoreId);
            if (scoremsg) scoremsg.edit({ content: "", embeds: [ embed ] });
          }
        }
      }).catch((err) => {});
    }, 50);
  }
  setscoreembed(): EmbedBuilder {
    let list: score[] = this.scoredata.filter(v => v.Id !== "skip");
    let textlist: string[] = [];
    list.sort((a, b) => a === b ? -1 : b.count - a.count);
    for (let i in list) {
      let obj = list[i];
      textlist.push(`**${Number(i)+1}.** <@${obj.Id}> : ${obj.count}`);
    }
    if (!textlist || textlist.length === 0) {
      textlist.push("없음");
    }
    var text = textlist.join("\n");
    text += `\n\n스킵한 문제 : ${this.scoredata.findIndex(v => v.Id === "skip") >= 0 ? this.scoredata[this.scoredata.findIndex(v => v.Id === "skip")].count : 0}개`;
    return client.mkembed({
      title: `**\` [ 퀴즈 스코어 ] \`**`,
      description: text,
      footer: { text: `스코어는 다음퀴즈 전까지 사라지지 않습니다.` }
    });
  }

  
  reset_skip(getcanskip: boolean = false) {
    this.skipdata.list = [];
    this.skipdata.can = getcanskip;
  }
  async skip(message: M | PM, userId: string) {
    var channel = await getbotchannel(message.guild!);
    if (!channel) return this.stop(message.guild!);
    var userchannel = getuserchannel(message.guild?.members.cache.get(userId));
    if (channel.id !== userchannel?.id) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**음성채널 오류**`,
        description: `봇이 있는 음성채널에 들어간뒤 사용해주세요.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (!this.skipdata.can) return;
    var maxmember = channel.members.size+1;
    channel.members.forEach((member) => {
      if (member.user.bot) maxmember-=1;
    });
    if (this.skipdata.list.includes(userId)) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**\` 이미 투표하셨습니다. \`**`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    this.skipdata.list.push(userId);
    if (this.skipdata.list.length >= Math.floor(maxmember / 2)) {
      this.reset_skip(false);
      if (this.playquiztype.quiz === "음악퀴즈") return this.music_anser(message, ["스킵"], userId);
      // if (this.playquiztype.quiz === "그림퀴즈") return this.img_anser(message, ["스킵"], userId);
      return;
    }
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `스킵 투표: ${this.skipdata.list.length}/${Math.floor(maxmember / 2)}`,
        description: `${Math.floor(maxmember / 2) - this.skipdata.list.length}명 남았습니다.`
      })
    ] });
  }

  reset_hint(getcanhint: boolean = false) {
    this.hintdata.already = false;
    this.hintdata.list = [];
    this.hintdata.can = getcanhint;
  }
  async hint(message: M | PM, userId: string, admin?: boolean) {
    var channel = await getbotchannel(message.guild!);
    if (!channel) return this.stop(message.guild!);
    var userchannel = getuserchannel(message.guild?.members.cache.get(userId));
    if (channel.id !== userchannel?.id) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**음성채널 오류**`,
        description: `봇이 있는 음성채널에 들어간뒤 사용해주세요.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (this.hintdata.already) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**힌트 오류**`,
        description: `이미 힌트를 받으셨습니다.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (!this.hintdata.can) return;
    var maxmember = channel.members.size+1;
    channel.members.forEach((member) => {
      if (member.user.bot) maxmember-=1;
    });
    if (this.hintdata.list.includes(userId)) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**\` 이미 투표하셨습니다. \`**`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    this.hintdata.list.push(userId);
    if (admin || this.hintdata.list.length >= Math.floor(maxmember / 2)) {
      this.reset_hint(false);
      var name = this.nowplaying?.name.trim().replace(/ +/g,' ');
      if (!name) return;
      var ilist: number[] = [];
      for (let i=0; i<name.length; i++) {
        if (/[~!@#$%^&*()_+|<>?:{}]/g.test(name[i])) continue;
        if (/\s/g.test(name[i])) continue;
        ilist.push(i);
      }
      ilist = fshuffle(ilist);
      var blist = ilist.slice(0, Math.floor(ilist.length / 2));
      var text = "";
      for (let i=0; i<name.length; i++) {
        if (blist.includes(i)) {
          text += `◻️`;
          continue;
        }
        text += name[i];
      }
      this.hintdata.already = true;
      return message.channel.send({ embeds: [
        client.mkembed({
          title: `**\` 힌트 \`**`,
          description: text.replace(/ +/g, "ㅤ").toUpperCase()
        })
      ] });
    }
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `힌트 투표: ${this.hintdata.list.length}/${Math.floor(maxmember / 2)}`,
        description: `${Math.floor(maxmember / 2) - this.hintdata.list.length}명 남았습니다.`
      })
    ] });
  }

  sendlog(text: string) {
    if (LOGCHANNEL?.length === 2) {
      let list: string[] = [];
      while(true) {
        if (text.length > 1980) {
          list.push(text.slice(0,1980));
          text = text.slice(1980);
        } else {
          list.push(text);
          break;
        }
      }
      const channel = client.guilds.cache.get(LOGCHANNEL[0])?.channels.cache.get(LOGCHANNEL[1]);
      if (channel?.type === ChannelType.GuildText) {
        for (let t of list) {
          (channel as TextChannel).send({ content: t }).catch((err) => {});
        }
      }
    }
  }
}

function bignum(n: number): string {
  return n === 1 ? "1️⃣"
    : n === 2 ? "2️⃣"
    : n === 3 ? "3️⃣"
    : n === 4 ? "4️⃣"
    : "5️⃣"
}