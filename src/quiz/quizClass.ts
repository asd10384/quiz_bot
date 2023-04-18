import "dotenv/config";
import { client } from "../index";
import { Guild, EmbedBuilder, StageChannel, TextChannel, VoiceChannel, ChannelType, Message, PartialMessage } from "discord.js";
import { QDB, guildData } from "../databases/Quickdb";
import request from "request";
import { CheerioAPI, load } from "cheerio";
import { QUIZ_RULE } from "../config/config";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import ytdl from "ytdl-core";
import internal from "stream";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Logger } from "../utils/Logger";
import { fshuffle } from "./shuffle";
import { getBotChannel, getUserChannel } from "./getChannel";
const sleep = (t: number) => new Promise(r => setTimeout(r, t));

const proxy = process.env.PROXY;
let agent: HttpsProxyAgent | undefined = undefined;
if (proxy) {
  agent = new HttpsProxyAgent(proxy);
} else {
  Logger.error("proxy를 찾을수 없음");
}

export const MUSIC_SITE = process.env.MUSIC_SITE ? process.env.MUSIC_SITE.trim().endsWith("/") ? process.env.MUSIC_SITE.trim().slice(0,-1) : process.env.MUSIC_SITE.trim() : "";
const LOGCHANNEL = process.env.LOGCHANNEL ? process.env.LOGCHANNEL.trim().replace(/ +/g,"").split(",") : undefined;
const YT_TOKEN = process.env.YT_TOKEN && process.env.YT_TOKEN.length != 0 ? process.env.YT_TOKEN : undefined;

interface page_data {
  desc: string;
  complite: number;
  customImage: boolean;
  start: boolean;
};
interface page {
  [key: string]: page_data;
};
interface nowplay {
  name: string;
  vocal: string;
  link: string;
  realnumber: number;
};
type score = { Id: string, count: number };

export class Quiz {
  guild: Guild;
  cooldown: number;
  playing: boolean;
  customImage: boolean;
  page: {
    page: number;
    maxpage: number;
    name: string | null;
    list: string[];
    userId: string | null;
    check: boolean;
    go: boolean;
  }
  nowplaying: nowplay;
  queue: nowplay[];
  count: number;
  maxcount: number;
  Player?: AudioPlayer;
  anserImg: string;
  anserUserId: string;
  cananser: boolean;
  score: score[];
  skip: {
    list: string[];
    can: boolean;
  };
  hint: {
    list: string[];
    can: boolean;
    already: boolean;
  };

  constructor(guild: Guild) {
    this.guild = guild;
    this.cooldown = 0;
    this.playing = false;
    this.customImage = false;
    this.page = {
      page: 0,
      maxpage: 0,
      name: null,
      list: [],
      userId: null,
      check: false,
      go: false
    };
    this.nowplaying = {
      name: "",
      vocal: "",
      link: "",
      realnumber: 0
    };
    this.queue = [];
    this.count = 0;
    this.maxcount = 0;
    this.anserImg = "";
    this.anserUserId = "";
    this.cananser = false;
    this.score = [];
    this.skip = {
      list: [],
      can: false
    };
    this.hint = {
      list: [],
      can: false,
      already: false
    };
  }

  setcooldown(getcooldown: number) {
    this.cooldown = getcooldown;
  }

  setcananser(getcananser: boolean) {
    this.cananser = getcananser;
  }

  setqueue(getQueue: nowplay[]) {
    this.queue = getQueue;
  }

  setpage(getpage: {
    page?: number;
    maxpage?: number;
    name?: string | null;
    list?: string[];
    userId?: string | null;
    check?: boolean;
    go?: boolean;
  }) {
    if (getpage.page != undefined) this.page.page = getpage.page;
    if (getpage.maxpage != undefined) this.page.maxpage = getpage.maxpage;
    if (getpage.name != undefined) this.page.name = getpage.name;
    if (getpage.list != undefined) this.page.list = getpage.list;
    if (getpage.userId != undefined) this.page.userId = getpage.userId;
    if (getpage.check != undefined) this.page.check = getpage.check;
    if (getpage.go != undefined) this.page.go = getpage.go;
  }

  async bulkMessage() {
    const guildDB = await QDB.guild.get(this.guild);
    const channel = this.guild.channels.cache.get(guildDB.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    await channel.messages.fetch({ after: guildDB.scoreId, cache: true }).then(async (ms) => {
      if (ms.size > 0) await (channel as TextChannel).bulkDelete(ms.size).catch(() => {});
    }).catch(() => {});
  }

  async stop(no?: boolean) {
    if (!no) this.bulkMessage();
    const guildDB = await QDB.guild.get(this.guild);
    const channel = this.guild.channels.cache.get(guildDB.channelId);
    if (channel?.type == ChannelType.GuildText) {
      const msg = channel.messages.cache.get(guildDB.msgId);
      msg?.reactions.removeAll();
    }
    this.playing = false;
    this.customImage = false;
    this.queue = [];
    this.nowplaying = {
      name: "",
      vocal: "",
      link: "",
      realnumber: 0
    };
    this.page = {
      check: false,
      go: false,
      list: [],
      maxpage: 0,
      name: null,
      page: 0,
      userId: null
    };
    this.score = [];
    this.cananser = false;
    this.resetSkip(false);
    this.resetHint(false);
    getVoiceConnection(this.guild.id)?.disconnect();
    this.setMsg();
    setTimeout(() => {
      this.checkMsg();
    }, 350);
  }

  async getTextChannel(): Promise<TextChannel | undefined> {
    const GDB = await QDB.guild.get(this.guild);
    if (!GDB.channelId) return undefined;
    const channel = this.guild.channels.cache.get(GDB.channelId);
    if (!channel || channel.type != ChannelType.GuildText) return undefined;
    return channel;
  }

  async getsite(): Promise<page> {
    return new Promise((res, rej) => {
      request.get(`${MUSIC_SITE}/music/music_list.js`, (err, _res2, body) => {
        if (err || !body) return rej(err);
        const data: page = eval(body)[0];
        return res(data);
      });
    });
  }

  async ready(message: Message | PartialMessage, userId: string) {
    if (MUSIC_SITE.length == 0) return message.channel.send({ embeds: [ client.mkembed({
      title: `사이트를찾을수없음`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 2));
    const guildDB = await QDB.guild.get(this.guild);
    const channel = client.channels.cache.get(guildDB.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return message.channel.send({ embeds: [ client.mkembed({
      title: `퀴즈 채널을 찾을수 없습니다.`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 2));
    const msg = channel.messages.cache.get(guildDB.msgId);
    if (!msg) return message.channel.send({ embeds: [ client.mkembed({
      title: `퀴즈 채널에 임베드를 찾을수 없습니다.`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 2));
    const data: page | undefined = await this.getsite().catch((err) => {
      if (client.debug) Logger.error(err);
      return undefined;
    });
    if (!data) return message.channel.send({ embeds: [ client.mkembed({
      title: `사이트 불러오기오류`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 2));
    if (!this.page.userId) {
      this.page.userId = userId;
      msg.reactions.removeAll().then(() => {
        msg.react('⬅️');
        msg.react('1️⃣');
        msg.react('2️⃣');
        msg.react('3️⃣');
        msg.react('4️⃣');
        msg.react('5️⃣');
        msg.react('↩️');
        msg.react('➡️');
      });
    }

    const embed = client.mkembed({
      footer: { text: `아래 이모지가 다 생성된뒤 눌러주세요.` }
    });

    if (this.page.check) {
      if (this.page.go) {
        msg.reactions.removeAll().then(() => {
          msg.react("💡");
          msg.react("⏭️");
        });
        return this.setquiz(userId);
      } else if (this.page.name) {
      embed.setTitle(`**${this.page.name ? this.page.name : "음악퀴즈"}**`)
        .setDescription(`
          **이름**: ${this.page.name}
          **설명**: ${data[this.page.name].desc}
          **완성도**: ${(data[this.page.name].complite == 100) ? "완성" : (data[this.page.name].complite == 0) ? "미완성" : `${data[this.page.name].complite}%`}
          
          1️⃣ 시작하기
          2️⃣ 뒤로가기
        `);
      }
    } else {
      let list: string[] = [];
      let keys = Object.keys(data);
      this.page.list = [];
      for (let i=0; i<keys.length; i++) {
        this.page.list.push(keys[i]);
        if (!list[Math.floor(i / 5)]) list[Math.floor(i / 5)] = "";
        list[Math.floor(i / 5)] += `${this.bignum((i % 5)+1)}  ${keys[i]}\n`;
      }
      embed.setTitle(`**음악퀴즈**`)
        .setDescription(`${list[this.page.page]}\n**[** 페이지 **:** ${this.page.page+1} **/** ${list.length} **]**`);
      this.page.maxpage = list.length-1;
    }
    msg.edit({
      content: `${QUIZ_RULE(guildDB!)}ㅤ`,
      embeds: [ embed ]
    }).catch(() => {});
  }

  getYID(url: string): string {
    return url.replace(/^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))|\&.+/g,"");
  }

  async setquiz_getsite(name: string): Promise<CheerioAPI> {
    return new Promise((res, rej) => {
      request.get(encodeURI(`${MUSIC_SITE}/music/${name}.html`), (err, _res2, html) => {
        if (err || !html) return rej(err);
        return res(load(html));
      });
    });
  }

  async setquiz(userId: string) {
    this.checkMsg();
    if (!this.page.name) return this.stop();
    const $ = await this.setquiz_getsite(this.page.name).catch((err) => {
      if (client.debug) Logger.error(err);
      return undefined;
    });
    const channel = await this.getTextChannel();
    if (!$) {
      this.stop();
      await sleep(100);
      return channel?.send({ embeds: [ client.mkembed({
        title: `오류발생`,
        description: `파일 불러오는중 오류발생`,
        color: "DarkRed"
      }) ] }).then(m => client.msgdelete(m, 1));
    }
    let first: { name: string, vocal: string, link: string; realnumber: number; }[] = [];
    let firstNotOverlap: { name: string, vocal: string, link: string; realnumber: number; }[] = [];
    const GDB = await QDB.guild.get(this.guild);
    $("body div.music div").each((i, el) => {
      let link = $(el).children("a.link").text().trim();
      if (!GDB.overLapQueue.includes(this.getYID(link))) {
        firstNotOverlap.push({
          name: ($(el).children("a.name").text().trim()),
          vocal: ($(el).children("a.vocal").text().trim()),
          link: ($(el).children("a.link").text().trim()),
          realnumber: i+1
        });
      }
      first.push({
        name: ($(el).children("a.name").text().trim()),
        vocal: ($(el).children("a.vocal").text().trim()),
        link: ($(el).children("a.link").text().trim()),
        realnumber: i+1
      });
    });
    const maxcount = GDB.options.onetimemax;
    if (firstNotOverlap.length < maxcount) {
      await QDB.guild.set(this.guild, { overLapQueue: [] }).catch(() => {});
    } else {
      first = firstNotOverlap;
    }
    let second: { name: string, vocal: string, link: string; realnumber: number; }[] = [];
    let count: number[] = Array.from(Array(first.length).keys());
    for (let i=0; i<5; i++) count = fshuffle(count);
    var logtext = `${this.guild.name} {\n`;
    var loopcount = 0;
    for (let i=0; i<maxcount; i++) {
      loopcount++;
      if (loopcount > first.length) {
        break;
      } else if (!first[count[i]]?.name) {
        first = first.filter((_v, i2) => i2 != count[i]);
        count = count.filter((_v, i2) => i2 != i);
        i--;
        continue;
      } else {
        second.push({
          name: first[count[i]].name,
          vocal: first[count[i]].vocal,
          link: first[count[i]].link,
          realnumber: count[i]
        });
        logtext += `  ${i+1}. [${count[i]}] ${first[count[i]].vocal} - ${first[count[i]].name}\n`;
      }
    }
    logtext += `}\n`;
    if (client.debug) Logger.log(logtext);
    if (LOGCHANNEL) this.sendlog(logtext);
    this.queue = second;
    this.count = 1;
    this.maxcount = second.length;
    return this.start(userId);
  }

  async start(userId: string) {
    this.cananser = false;
    this.Player?.removeAllListeners();
    this.Player?.stop();
    this.Player = undefined;
    var voicechannel: VoiceChannel | StageChannel | null | undefined = undefined;
    const Textchannel = await this.getTextChannel();
    voicechannel = await getBotChannel(this.guild);
    if (!voicechannel && this.page.userId) voicechannel = getUserChannel(this.guild.members.cache.get(this.page.userId));
    let connection = getVoiceConnection(this.guild.id);
    if (!connection && !voicechannel) return Textchannel?.send({ embeds: [
      client.mkembed({
        title: `\` 음성 오류 \``,
        description: `음성채널을 찾을수 없습니다.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (this.count > this.maxcount) return this.stop();
    const data = this.queue.shift();
    if (!data) return this.stop();
    if (!data.link || !data.name) {
      if (client.debug) Logger.error("데이터를 찾을수 없음: " + JSON.stringify(data));
      return this.anser(["스킵", "오류"], userId);
    }
    const yid = this.getYID(data.link);
    this.nowplaying = {
      ...data,
      link: "https://youtu.be/" + yid
    };
    this.playing = true;
    this.anserUserId = "";
    this.anserImg = this.customImage
      ? `${MUSIC_SITE}/images/${encodeURIComponent(this.page.name!)}/${this.nowplaying?.link.replace("https://youtu.be/","")}.jpg`
      : `https://img.youtube.com/vi/${this.nowplaying?.link.replace("https://youtu.be/","")}/sddefault.jpg`;
    let overLapQueue = (await QDB.guild.get(this.guild)).overLapQueue;
    overLapQueue.push(yid);
    await QDB.guild.set(this.guild, { overLapQueue: overLapQueue });
    await this.bulkMessage();
    this.setMsg();
    this.checkMsg();
    if (!connection) connection = joinVoiceChannel({
      adapterCreator: this.guild.voiceAdapterCreator! as DiscordGatewayAdapterCreator,
      channelId: voicechannel!.id,
      guildId: this.guild.id
    });
    const Player = createAudioPlayer();
    connection.setMaxListeners(0);
    Player.setMaxListeners(0);
    Player.on("error", (err) => {
      if (client.debug) Logger.error("Player 오류: " + err);
      Player.removeAllListeners();
      Player.stop();
      return this.anser(["스킵", "오류"], userId);
    });
    connection.on("error", (err) => {
      if (client.debug) Logger.error("connection 오류: " + err);
      Player.removeAllListeners();
      Player.stop();
      return this.anser(["스킵", "오류"], userId);
    });
    var checkvideo = await ytdl.getInfo(this.nowplaying.link, {
      lang: "KR",
      requestOptions: {
        agent,
        headers: {
          cookie: YT_TOKEN
        }
      }
    }).catch(() => {
      checkvideo = undefined;
      return undefined;
    });
    if (!checkvideo) {
      Player.removeAllListeners();
      Player.stop();
      return this.anser(["스킵", "오류"], userId);
    }
    var ytsource: internal.Readable | undefined = undefined;
    try {
      if (client.debug) Logger.log(`${this.guild.name} {\n  get: ${this.page.name}\n  number: ${this.count}\n  realnumber: ${this.nowplaying.realnumber+1}\n  name: ${this.nowplaying.vocal}-${this.nowplaying.name}\n  link: ${this.nowplaying.link}\n}`);
      if (LOGCHANNEL) this.sendlog(`${this.guild.name} {\n  get: ${this.page.name}\n  number: ${this.count}\n  realnumber: ${this.nowplaying.realnumber+1}\n  name: ${this.nowplaying.vocal}-${this.nowplaying.name}\n  link: ${this.nowplaying.link}\n}`);
      ytsource = ytdl(this.nowplaying.link, {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25,
        requestOptions: {
          agent,
          headers: {
            cookie: YT_TOKEN
          }
        }
      });
      ytsource.on("error", (err) => {
        if (client.debug) Logger.error('ytdl-core오류1: ' + err);
        ytsource = undefined;
        return undefined;
      });
    } catch(err) {
      ytsource = undefined;
    }
    if (!ytsource) {
      Player.stop();
      return this.anser(["스킵", "오류"], userId);
    }
    this.cananser = true;
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch(() => {});
    const resource = createAudioResource(ytsource, {
      inlineVolume: true,
      inputType: StreamType.Arbitrary
    });
    resource.volume?.setVolume(0.5);
    Player.play(resource);
    this.Player = Player;
    const subscription = connection.subscribe(Player);
    this.resetSkip(true);
    this.resetHint(true);
    Player.on(AudioPlayerStatus.Idle, async (_p) => {
      if (ytsource) {
        Player.stop();
        this.anser(["스킵", "시간초과"], userId);
      }
    });
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.stop();
      connection?.disconnect();
    });
    return subscription;
  }
  
  async anser(args: string[], userId: string) {
    this.cananser = false;
    this.resetSkip(false);
    this.resetHint(false);
    const guildDB = await QDB.guild.get(this.guild);
    var anser_user = `<@${userId}>`;
    if (args[0] == "스킵" || args[0] == "skip") {
      anser_user = (args[1] == '시간초과')
        ? '시간 초과로 스킵되었습니다.'
        : (args[1] == '관리자')
        ? `<@${userId}> 님이 강제로 스킵했습니다.`
        : (args[1] == "오류")
        ? `노래 오류로 스킵되었습니다.`
        : '스킵하셨습니다.';
      if (this.score.findIndex(v => v.Id == "skip") < 0) this.score.push({ Id: "skip", count: 0 });
      this.score[this.score.findIndex(v => v.Id == "skip")] = {
        Id: "skip",
        count: this.score[this.score.findIndex(v => v.Id == "skip")].count += 1
      };
    } else {
      if (this.score.findIndex(v => v.Id == userId) < 0) this.score.push({ Id: userId, count: 0 });
      this.score[this.score.findIndex(v => v.Id == userId)] = {
        Id: userId,
        count: this.score[this.score.findIndex(v => v.Id == userId)].count += 1
      };
    }
    this.setScore();
    this.count = this.count + 1;
    this.anserUserId = userId;
    const time = guildDB.options.nexttime;
    this.setMsg(anser_user, time);
    this.bulkMessage();
    setTimeout(() => {
      const vc = getVoiceConnection(this.guild.id);
      if (vc && this.playing && this.queue.length > 0) {
        try {
          if (this.playing) this.start(userId);
        } catch {
          this.stop();
        }
      } else {
        this.stop();
      }
    }, time * 1000);
  }

  checkMsg() {
    QDB.guild.get(this.guild).then((guildDB) => {
      if (guildDB) {
        const channel = this.guild.channels.cache.get(guildDB.channelId);
        if (channel?.type == ChannelType.GuildText) {
          if (!channel.messages.cache.get(guildDB.msgId) || !channel.messages.cache.get(guildDB.scoreId)) {
            channel.messages.fetch({ cache: true }).then(async (ms) => {
              if (ms.size > 0) await channel.bulkDelete(ms.size).catch(() => {});
              const msg = await channel.send({ content: "퀴즈오류해결중..." });
              const score = await channel.send({ content: "스코어보드오류해결중..." });
              client.getqc(this.guild).sendlog(`${this.guild.name} {\n  err: 퀴즈오류 + 스코어보드오류 해결중\n}`);
              QDB.guild.set(this.guild, { msgId: msg.id, scoreId: score.id }).then(() => {
                setTimeout(() => {
                  this.setMsg();
                  this.setScore();
                }, 600);
              }).catch(() => {});
            }).catch(() => {});
            return;
          }
        }
      }
    });
  }
  setScore() {
    setTimeout(() => {
      QDB.guild.get(this.guild).then((guildDB) => {
        if (guildDB) {
          const embed = this.setScoreEmbed();
          const channel = this.guild.channels.cache.get(guildDB.channelId);
          if (channel?.type == ChannelType.GuildText) {
            const scoremsg = channel.messages.cache.get(guildDB.scoreId);
            if (scoremsg) scoremsg.edit({ content: "", embeds: [ embed ] });
          }
        }
      }).catch(() => {});
    }, 50);
  }
  setScoreEmbed(): EmbedBuilder {
    let list: score[] = this.score.filter(v => v.Id !== "skip");
    let textlist: string[] = [];
    list.sort((a, b) => a == b ? -1 : b.count - a.count);
    for (let i in list) {
      let obj = list[i];
      textlist.push(`**${Number(i)+1}.** <@${obj.Id}> : ${obj.count}`);
    }
    if (!textlist || textlist.length == 0) {
      textlist.push("없음");
    }
    var text = textlist.join("\n");
    text += `\n\n스킵한 문제 : ${this.score.findIndex(v => v.Id == "skip") >= 0 ? this.score[this.score.findIndex(v => v.Id == "skip")].count : 0}개`;
    return client.mkembed({
      title: `**\` [ 퀴즈 스코어 ] \`**`,
      description: text,
      footer: { text: `스코어는 다음퀴즈 전까지 사라지지 않습니다.` }
    });
  }
  setMsg(anser_user?: string, time?: number) {
    setTimeout(() => {
      QDB.guild.get(this.guild).then((guildDB) => {
        if (guildDB) {
          let text = `${this.setList(guildDB)}`;
          let embed = this.setEmbed(guildDB, anser_user, time);
          const channel = this.guild.channels.cache.get(guildDB.channelId);
          if (channel && channel.type == ChannelType.GuildText) channel.messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] }).catch(() => {});
        }
      }).catch(() => {});
    }, 50);
  }
  setList(guildDB: guildData): string {
    if (this.playing) {
      return `퀴즈를 종료하시려면 \` ${client.prefix}퀴즈 종료 \`를 입력해주세요.
  퀴즈가 진행되지 않거나 오류가 발생했을때 \` ${client.prefix}퀴즈 fix \`를 입력해주세요.
  힌트를 받으시려면 \`힌트 \`를 입력하거나 💡를 눌러주세요.
  문제를 스킵하시려면 \` 스킵 \`을 입력하거나 ⏭️을 눌러주세요.\nㅤ`;
    } else {
      return `${QUIZ_RULE(guildDB)}ㅤ`;
    }
  }
  setEmbed(guildDB: guildData, anser_user?: string, time?: number): EmbedBuilder {
    let data = this.nowplaying!;
    let embed = client.mkembed({
      footer: { text: `${client.prefix}퀴즈 도움말` }
    });
    if (this.playing) {
      if (this.anserUserId.length > 0) {
        embed.setTitle(`**정답 : ${data.name}**`)
          .setURL(data.link)
          .setDescription(`
            **가수 : ${data.vocal}**
            **정답자 : ${anser_user ? anser_user : `<@${this.anserUserId}>`}**
            **[ ${this.count-1} / ${this.maxcount} ]**
          `)
          .setImage(this.anserImg)
          .setFooter({ text: `${time ? time : 10}초 뒤에 다음문제로 넘어갑니다.` });
      } else {
        embed.setTitle(`**정답 : ???**`)
          .setDescription(`
            **가수 : ???**
            **정답자 : ???**
            **[ ${this.count} / ${this.maxcount} ]**
          `)
          .setFooter({ text: `재생한 노래: ${guildDB.overLapQueue.length}개` })
          .setImage(`https://ytms.netlify.app/question_mark.png`);
      }
    } else {
      embed.setTitle(`**현재 퀴즈가 시작되지 않았습니다.**`)
        .setDescription(`**문제수 : ${guildDB.options.onetimemax}개씩**\n**다음문제시간 : ${guildDB.options.nexttime}초**`)
        .setImage(`https://ytms.netlify.app/defult.png`)
        .setFooter({ text: `재생한 노래: ${guildDB.overLapQueue.length}개` });
    }
    return embed;
  }

  resetSkip(getcanskip: boolean = false) {
    this.skip.list = [];
    this.skip.can = getcanskip;
  }
  async setSkip(message: Message | PartialMessage, userId: string) {
    var channel = await getBotChannel(this.guild);
    if (!channel) return this.stop();
    var userchannel = getUserChannel(this.guild.members.cache.get(userId));
    if (channel.id !== userchannel?.id) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**음성채널 오류**`,
        description: `봇이 있는 음성채널에 들어간뒤 사용해주세요.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (!this.skip.can) return;
    var maxmember = channel.members.size+1;
    channel.members.forEach((member) => {
      if (member.user.bot) maxmember-=1;
    });
    if (this.skip.list.includes(userId)) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**\` 이미 투표하셨습니다. \`**`,
        description: `${Math.floor(maxmember / 2) - this.skip.list.length}명 남았습니다.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    this.skip.list.push(userId);
    if (this.skip.list.length >= Math.floor(maxmember / 2)) {
      this.resetSkip(false);
      return this.anser(["스킵"], userId);
    }
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `스킵 투표: ${this.skip.list.length}/${Math.floor(maxmember / 2)}`,
        description: `${Math.floor(maxmember / 2) - this.skip.list.length}명 남았습니다.`
      })
    ] });
  }

  resetHint(getcanhint: boolean = false) {
    this.hint.already = false;
    this.hint.list = [];
    this.hint.can = getcanhint;
  }
  async setHint(message: Message | PartialMessage, userId: string, admin?: boolean) {
    var channel = await getBotChannel(this.guild);
    if (!channel) return this.stop();
    var userchannel = getUserChannel(this.guild.members.cache.get(userId));
    if (channel.id !== userchannel?.id) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**음성채널 오류**`,
        description: `봇이 있는 음성채널에 들어간뒤 사용해주세요.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (this.hint.already) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**힌트 오류**`,
        description: `이미 힌트를 받으셨습니다.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (!this.hint.can) return;
    if (admin) return this.sendHint(message);
    var maxmember = channel.members.size+1;
    channel.members.forEach((member) => {
      if (member.user.bot) maxmember-=1;
    });
    if (this.hint.list.includes(userId)) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**\` 이미 투표하셨습니다. \`**`,
        description: `${Math.floor(maxmember / 2) - this.hint.list.length}명 남았습니다.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    this.hint.list.push(userId);
    if (this.hint.list.length >= Math.floor(maxmember / 2)) return this.sendHint(message);
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `힌트 투표: ${this.hint.list.length}/${Math.floor(maxmember / 2)}`,
        description: `${Math.floor(maxmember / 2) - this.hint.list.length}명 남았습니다.`
      })
    ] });
  }

  sendHint(message: Message | PartialMessage) {
    this.resetHint(false);
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
    this.hint.already = true;
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `**\` 힌트 \`**`,
        description: text.replace(/ +/g, "ㅤ").toUpperCase()
      })
    ] });
  }

  
  bignum(n: number): string {
    return n == 1 ? "1️⃣"
      : n == 2 ? "2️⃣"
      : n == 3 ? "3️⃣"
      : n == 4 ? "4️⃣"
      : "5️⃣"
  }

  sendlog(text: string) {
    if (LOGCHANNEL?.length == 2) {
      let list: string[] = [];
      while(true) {
        if (text.length > 1980) {
          list.push(text.slice(0, 1980));
          text = text.slice(1980);
        } else {
          list.push(text);
          break;
        }
      }
      const channel = client.guilds.cache.get(LOGCHANNEL[0])?.channels.cache.get(LOGCHANNEL[1]);
      if (channel?.type == ChannelType.GuildText) {
        for (let t of list) {
          channel.send({ content: t }).catch(() => {});
        }
      }
    }
  }
}