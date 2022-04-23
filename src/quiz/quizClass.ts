import "dotenv/config";
import { client } from "../index";
import { I, M, PM } from "aliases/discord.js";
import { Guild, MessageEmbed, StageChannel, TextChannel, VoiceChannel } from "discord.js";
import MDB from "../database/Mongodb";
import request from "request";
import { CheerioAPI, load } from "cheerio";
import { fshuffle } from "./shuffle";
import { QUIZ_RULE } from "../config";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import { getbotchannel, getuserchannel } from "./getchannel";
import { guild_type } from "database/obj/guild";
import ytdl from "ytdl-core";
import internal from "stream";
import { HttpsProxyAgent } from "https-proxy-agent";
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
  quiz: string;
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

export interface quiz {
  anser: string | null;
  image: string;
  type: page_data;
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[];
  count: [ number, number ];
  page: {
    go: boolean | null;
    page: string[];
    now: number;
    first: boolean;
    list: string[];
    maxpage: number;
    player: string | null;
  }
};

interface getreactpage {
  go?: boolean | null;
  page?: string[];
  now?: number;
  first?: boolean;
  list?: string[];
  maxpage?: number;
  player?: string | null;
}

type gethtmlsite = { name: string, vocal: string, link: string; realnumber: number; };

type score = { Id: string, count: number };

export default class Quiz {
  cooldown: number;
  guild: Guild;
  score: score[];
  anser: string | null;
  image: string;
  type: page_data;
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[];
  count: [ number, number ];
  page: {
    go: boolean | null;
    page: string[];
    now: number;
    first: boolean;
    list: string[];
    maxpage: number;
    player: string | null;
  };
  quizanser: boolean;
  guildStop: boolean;
  guildPlayer: AudioPlayer | undefined;
  canskip: boolean;
  skiplist: string[];
  alreadyhint: boolean;
  canhint: boolean;
  hintlist: string[];

  constructor(guild: Guild) {
    this.guild = guild;
    this.cooldown = 0;
    this.playing = false;
    this.queue = [];
    this.nowplaying = null;
    this.count = [ 1, 1 ];
    this.page = {
      first: true,
      go: null,
      list: [],
      now: 0,
      page: [],
      player: null,
      maxpage: 1
    };
    this.score = [];
    this.anser = null;
    this.image = "";
    this.type = {
      complite: 0,
      customimg: false,
      desc: "",
      quiz: "",
      space: false,
      start: false,
      url: ""
    };
    this.quizanser = false;
    this.guildStop = true;
    this.guildPlayer = undefined;
    this.canskip = false;
    this.skiplist = [];
    this.alreadyhint = false;
    this.canhint = false;
    this.hintlist = [];
  }

  setcooldown(getcooldown: number) {
    this.cooldown = getcooldown;
  }

  setqueue(getqueue: nowplay[]) {
    this.queue = getqueue;
  }

  setquizanser(getquizanser: boolean) {
    this.quizanser = getquizanser;
  }

  setpage(getpage: getreactpage) {
    if (getpage.first !== undefined) this.page.first = getpage.first;
    if (getpage.go !== undefined) this.page.go = getpage.go;
    if (getpage.list !== undefined) this.page.list = getpage.list;
    if (getpage.maxpage !== undefined) this.page.maxpage = getpage.maxpage;
    if (getpage.now !== undefined) this.page.now = getpage.now;
    if (getpage.page !== undefined) this.page.page = getpage.page;
    if (getpage.player !== undefined) this.page.player = getpage.player;
  }

  async quiz_getsite(): Promise<page> {
    return new Promise((res, rej) => {
      request.get(`${MUSIC_SITE}/music_list.js`, (err, res2, body) => {
        if (err || !body) return rej(err);
        const data: page = eval(body)[0];
        return res(data);
      });
    });
  }

  async quiz_start(message: M | PM, userId: string) {
    if (MUSIC_SITE.length === 0) return message.channel.send({ embeds: [ client.mkembed({
      title: `사이트를찾을수없음`,
      color: "DARK_RED"
    }) ] });
    const guildDB = await MDB.get.guild(message.guild!);
    if (!guildDB) return message.channel.send({ embeds: [ client.mkembed({
      title: `데이터베이스를 찾을수없음`,
      color: "DARK_RED"
    }) ] });
    const data: page | undefined = await this.quiz_getsite().catch((err) => {
      if (client.debug) console.log(err);
      return undefined;
    });
    if (!data) return message.channel.send({ embeds: [ client.mkembed({
      title: `사이트 불러오기오류`,
      color: "DARK_RED"
    }) ] });
    let list: string[] = [];
    var getkey: string[] = [];
    var getvalue: page_data | null = null;
    var channel = client.channels.cache.get(guildDB.channelId) as TextChannel;
    var msg = channel.messages.cache.get(guildDB.msgId);
    if (this.page.first) {
      this.page.first = false;
      this.page.player = message.author!.id;
      msg?.reactions.removeAll();
      msg?.react('⬅️');
      msg?.react('1️⃣');
      msg?.react('2️⃣');
      msg?.react('3️⃣');
      msg?.react('4️⃣');
      msg?.react('5️⃣');
      msg?.react('↩️');
      msg?.react('➡️');
    }
    if (this.page.go !== null) {
      if (this.page.go) {
        getvalue = data[this.page.page[0]][this.page.page[1]][this.page.page[2]];
        this.type = getvalue;
        msg?.reactions.removeAll();
        msg?.react("💡");
        msg?.react("⏭️");
        this.setquiz(message, getvalue, userId);
      } else {
        this.page.go = null;
        this.page.page = this.page.page.slice(0,-2);
      }
    }
    switch (this.page.page.length) {
      case 0:
        getkey = Object.keys(data);
        break;
      case 1:
        getkey = Object.keys(data[this.page.page[0]]);
        break;
      case 2:
        getkey = Object.keys(data[this.page.page[0]][this.page.page[1]]);
        break;
      case 3:
        getkey = Object.keys(data[this.page.page[0]][this.page.page[1]][this.page.page[2]]);
        getvalue = data[this.page.page[0]][this.page.page[1]][this.page.page[2]];
        break;
    }
    const embed = client.mkembed({
      footer: { text: `아래 이모지가 다 생성된뒤 눌러주세요.` }
    });
    if (getvalue) {
      embed.setTitle(`**${this.page.page.join("/") ? this.page.page.join("/") : "퀴즈"}**`)
        .setDescription(`
          **이름**: ${this.page.page[this.page.page.length-1]}
          **형식**: ${getvalue.quiz}
          **설명**: ${getvalue.desc}
          **완성도**: ${(getvalue.complite === 100) ? "완성" : (getvalue.complite === 0) ? "미완성" : `${getvalue.complite}%`}
          
          1️⃣ 시작하기
          2️⃣ 뒤로가기
        `);
      this.page.list = [ "시작하기", "뒤로가기" ];
    } else {
      for (let i=0; i<getkey.length; i++) {
        let key = getkey[i];
        if (!list[Math.floor(i / 5)]) list[Math.floor(i / 5)] = "";
        list[Math.floor(i / 5)] += `${bignum((i % 5)+1)}  ${key}\n`;
      }
      embed.setTitle(`**${this.page.page.join("/") ? this.page.page.join("/") : "퀴즈"}**`)
        .setDescription(`${list[this.page.now]}\n**[** 페이지 **:** ${this.page.now+1} **/** ${list.length} **]**`);
      this.page.list = getkey;
      this.page.maxpage = list.length - 1;
      if (this.page.maxpage < 0) this.page.maxpage = 0;
    }
    msg?.edit({
      content: `${QUIZ_RULE(guildDB!)}ㅤ`,
      embeds: [ embed ]
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
  async setquiz(message: M | PM, getvalue: page_data, userId: string) {
    const $ = await this.setquiz_getsite(getvalue.url).catch((err) => {
      if (client.debug) console.log(err);
      return undefined;
    });
    if (!$) {
      this.quiz_stop(message.guild!);
      await sleep(100);
      return message.channel.send({ embeds: [ client.mkembed({
        title: `오류발생`,
        description: `파일 불러오는중 오류발생`,
        color: "DARK_RED"
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
    this.quiz(message, userId);
  }

  sendlog(text: string) {
    if (LOGCHANNEL && LOGCHANNEL.length === 2) {
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
      if (channel) {
        for (let t of list) {
          (channel as TextChannel).send({ content: t }).catch((err) => {});
        }
      }
    }
  }

  async quiz(message: M | PM, userId: string) {
    this.quizanser = true;
    this.guildStop = true;
    this.guildPlayer?.stop();
    this.guildPlayer = undefined;
    var voicechannel: VoiceChannel | StageChannel | null | undefined = undefined;
    var connection = getVoiceConnection(message.guildId!);
    if (!connection) voicechannel = getbotchannel(message.guild!);
    if (!connection && !voicechannel) voicechannel = getuserchannel(message.guild?.members.cache.get(userId));
    if (!connection && !voicechannel) return message.channel.send({ embeds: [
      client.mkembed({
        title: `\` 음성 오류 \``,
        description: `음성채널을 찾을수 없습니다.`,
        color: "DARK_RED"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (this.count[0] > this.count[1]) return this.quiz_stop(message.guild!);
    const data = this.queue.shift();
    if (!data) return this.quiz_stop(message.guild!);
    this.nowplaying = data;
    this.playing = true;
    this.anser = null;
    this.image = (this.type.customimg) 
      ? `${process.env.MUSIC_SITE}/customimg/${this.page.page.slice(0,-1).join("/")}/${this.nowplaying?.name}.png`
      || `${process.env.MUSIC_SITE}/customimg/${this.page.page.slice(0,-1).join("/")}/${this.nowplaying?.name}.png`
      : `https://img.youtube.com/vi/${this.nowplaying?.link.replace("https://youtu.be/","")}/sddefault.jpg`;
    await this.bulkmessage(message.guild!);
    this.setmsg(message.guild!);
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
      return this.quiz_anser(message, ["스킵", "오류"], userId);
    });
    connection.on("error", (err) => {
      if (client.debug) console.log("connection 오류:", err);
      Player.stop();
      return this.quiz_anser(message, ["스킵", "오류"], userId);
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
      return this.quiz_anser(message, ["스킵", "오류"], userId);
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
      return this.quiz_anser(message, ["스킵", "오류"], userId);
    }
    this.quizanser = false;
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
    this.guildStop = false;
    const resource = createAudioResource(ytsource, {
      inlineVolume: true, inputType: StreamType.Arbitrary
    });
    resource.volume?.setVolume(0.5);
    Player.play(resource);
    this.guildPlayer = Player;
    const subscription = connection.subscribe(Player);
    this.reset_skip(true);
    this.reset_hint(true);
    Player.on(AudioPlayerStatus.Idle, async (p) => {
      if (ytsource && !this.guildStop) {
        Player.stop();
        this.quiz_anser(message, ["스킵", "시간초과"], userId);
      }
    });
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.quiz_stop(message.guild!);
      connection?.disconnect();
    });
  }

  async quiz_anser(message: M | PM, args: string[], userId: string) {
    this.reset_skip(false);
    this.reset_hint(false);
    const guildDB = await MDB.get.guild(message.guild!);
    var anser_user = `<@${userId}>`;
    if (args[0] === "스킵" || args[0] === "skip") {
      anser_user = (args[1] === '시간초과') 
        ? '시간 초과로 스킵되었습니다.' 
        : (args[1] === '관리자') 
        ? `<@${userId}> 님이 강제로 스킵했습니다.`
        : (args[1] === "오류")
        ? `노래 오류로 스킵되었습니다.`
        : '스킵하셨습니다.';
      if (this.score.findIndex(v => v.Id === "skip") < 0) this.score.push({ Id: "skip", count: 0 });
      this.score[this.score.findIndex(v => v.Id === "skip")] = {
        Id: "skip",
        count: this.score[this.score.findIndex(v => v.Id === "skip")].count += 1
      };
    } else {
      if (this.score.findIndex(v => v.Id === message.author!.id) < 0) this.score.push({ Id: message.author!.id, count: 0 });
      this.score[this.score.findIndex(v => v.Id === message.author!.id)] = {
        Id: message.author!.id,
        count: this.score[this.score.findIndex(v => v.Id === message.author!.id)].count += 1
      };
    }
    this.quiz_score(message.guild!);
    this.count[0] = this.count[0] + 1;
    this.anser = userId;
    const time = guildDB!.options.nexttime;
    await this.bulkmessage(message.guild!);
    this.setmsg(message.guild!, anser_user, time);
    setTimeout(() => {
      const vc = getVoiceConnection(message.guildId!);
      if (vc && this.playing && this.queue.length > 0) {
        try {
          this.quiz(message, userId);
        } catch {
          this.quiz_stop(message.guild!);
        }
      } else {
        this.quiz_stop(message.guild!);
      }
    }, time * 1000);
  }

  quiz_score(guild: Guild) {
    setTimeout(() => {
      MDB.module.guild.findOne({ id: guild.id }).then((guildDB) => {
        if (guildDB) {
          let embed = this.setscoreembed();
          let channel = guild.channels.cache.get(guildDB.channelId);
          (channel as TextChannel).messages.cache.get(guildDB.scoreId)?.edit({ embeds: [ embed ] });
        }
      });
    }, 50);
  }
  
  setscoreembed(): MessageEmbed {
    let list: score[] = this.score.filter(v => v.Id !== "skip");
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
    text += `\n\n스킵한 문제 : ${this.score.findIndex(v => v.Id === "skip") >= 0 ? this.score[this.score.findIndex(v => v.Id === "skip")].count : 0}개`;
    return client.mkembed({
      title: `**\` [ 퀴즈 스코어 ] \`**`,
      description: text,
      footer: { text: `스코어는 다음퀴즈 전까지 사라지지 않습니다.` }
    });
  }

  reset_skip(getcanskip: boolean = false) {
    this.skiplist = [];
    this.canskip = getcanskip;
  }
  async quiz_skip(message: M | PM, userId: string) {
    var channel = getbotchannel(message.guild!);
    if (!channel) return this.quiz_stop(message.guild!);
    var userchannel = getuserchannel(message.guild?.members.cache.get(userId));
    if (channel.id !== userchannel?.id) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**음성채널 오류**`,
        description: `봇이 있는 음성채널에 들어간뒤 사용해주세요.`,
        color: "DARK_RED"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (!this.canskip) return;
    var maxmember = channel.members.size+1;
    channel.members.forEach((member) => {
      if (member.user.bot) maxmember-=1;
    });
    if (this.skiplist.includes(userId)) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**\` 이미 투표하셨습니다. \`**`,
        color: "DARK_RED"
      })
    ] }).then(m => client.msgdelete(m, 1));
    this.skiplist.push(userId);
    if (this.skiplist.length >= Math.floor(maxmember / 2)) {
      this.reset_skip(false);
      return this.quiz_anser(message, ["스킵"], userId);
    }
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `스킵 투표: ${this.skiplist.length}/${Math.floor(maxmember / 2)}`,
        description: `${Math.floor(maxmember / 2) - this.skiplist.length}명 남았습니다.`
      })
    ] });
  }

  reset_hint(getcanhint: boolean = false) {
    this.alreadyhint = false;
    this.canhint = getcanhint;
    this.hintlist = [];
  }
  async quiz_hint(message: M | PM, userId: string, admin?: boolean) {
    var channel = getbotchannel(message.guild!);
    if (!channel) return this.quiz_stop(message.guild!);
    var userchannel = getuserchannel(message.guild?.members.cache.get(userId));
    if (channel.id !== userchannel?.id) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**음성채널 오류**`,
        description: `봇이 있는 음성채널에 들어간뒤 사용해주세요.`,
        color: "DARK_RED"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (this.alreadyhint) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**힌트 오류**`,
        description: `이미 힌트를 받으셨습니다.`,
        color: "DARK_RED"
      })
    ] }).then(m => client.msgdelete(m, 1));
    if (!this.canhint) return;
    var maxmember = channel.members.size+1;
    channel.members.forEach((member) => {
      if (member.user.bot) maxmember-=1;
    });
    if (this.hintlist.includes(userId)) return message.channel.send({ embeds: [
      client.mkembed({
        title: `**\` 이미 투표하셨습니다. \`**`,
        color: "DARK_RED"
      })
    ] }).then(m => client.msgdelete(m, 1));
    this.hintlist.push(userId);
    if (admin || this.hintlist.length >= Math.floor(maxmember / 2)) {
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
      this.alreadyhint = true;
      return message.channel.send({ embeds: [
        client.mkembed({
          title: `**\` 힌트 \`**`,
          description: text.replace(/ +/g, "ㅤ").toUpperCase()
        })
      ] });
    }
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `힌트 투표: ${this.hintlist.length}/${Math.floor(maxmember / 2)}`,
        description: `${Math.floor(maxmember / 2) - this.hintlist.length}명 남았습니다.`
      })
    ] });
  }

  async bulkmessage(guild: Guild) {
    const guildDB = await MDB.get.guild(guild);
    const channel = guild.channels.cache.get(guildDB!.channelId) as TextChannel | undefined;
    if (!channel) return;
    await channel.messages.fetch({ after: guildDB!.scoreId }).then(async (ms) => {
      if (ms.size > 0) await channel.bulkDelete(ms.size).catch(() => {});
    });
    return await sleep(50);
  }
  
  async quiz_stop(guild: Guild, no?: boolean) {
    if (!no) await this.bulkmessage(guild);
    let guildDB = await MDB.module.guild.findOne({ id: guild.id });
    if (!guildDB) return;
    var channel = guild.channels.cache.get(guildDB.channelId) as TextChannel;
    var msg = channel.messages.cache.get(guildDB.msgId);
    msg?.reactions.removeAll();
    this.playing = false;
    this.queue = [];
    this.nowplaying = {
      name: "",
      vocal: "",
      link: "",
      realnumber: 0
    };
    this.count = [ 1, 1 ];
    this.page = {
      first: true,
      go: null,
      list: [],
      now: 0,
      page: [],
      player: null,
      maxpage: 1
    };
    this.score = [];
    this.quizanser = false;
    this.reset_skip(false);
    this.reset_hint(false);
    this.setmsg(guild);
    getVoiceConnection(guild.id)?.disconnect();
  }
  
  setmsg(guild: Guild, anser_user?: string, time?: number) {
    setTimeout(() => {
      MDB.module.guild.findOne({ id: guild.id }).then((guildDB) => {
        if (guildDB) {
          let text = `${this.setlist(guildDB)}`;
          let embed = this.setembed(guildDB, anser_user, time);
          let channel = guild.channels.cache.get(guildDB.channelId);
          try {
            (channel as TextChannel).messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] });
          } catch (err) {}
        }
      });
    }, 50);
  }
  setlist(guildDB: guild_type): string {
    if (this.playing) {
      return `퀴즈를 종료하시려면 \` ${client.prefix}퀴즈 종료 \`를 입력해주세요.
  퀴즈가 진행되지 않거나 오류가 발생했을때 \` ${client.prefix}퀴즈 fix \`를 입력해주세요.
  힌트를 받으시려면 \`힌트 \`를 입력하거나 💡를 눌러주세요.
  문제를 스킵하시려면 \` 스킵 \`을 입력하거나 ⏭️을 눌러주세요.\nㅤ`;
    } else {
      return `${QUIZ_RULE(guildDB)}ㅤ`;
    }
  }
  setembed(guildDB: guild_type, anser_user?: string, time?: number): MessageEmbed {
    let data = this.nowplaying!;
    let embed = client.mkembed({
      footer: { text: `${client.prefix}퀴즈 도움말` }
    });
    if (this.playing) {
      if (this.anser) {
        embed.setTitle(`**정답 : ${data.name}**`)
          .setURL(data.link)
          .setDescription(`
            **가수 : ${data.vocal}**
            **정답자 : ${anser_user ? anser_user : `<@${this.anser}>`}**
            **[ ${this.count[0]-1} / ${this.count[1]} ]**
          `)
          .setImage(this.image)
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
}

function bignum(n: number): string {
  return n === 1 ? "1️⃣"
    : n === 2 ? "2️⃣"
    : n === 3 ? "3️⃣"
    : n === 4 ? "4️⃣"
    : "5️⃣"
}