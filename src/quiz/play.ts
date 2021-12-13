import { client } from "..";
import { PM, M, I } from "../aliases/discord.js.js"
import { nowplay } from "../database/obj/guild";
import ytsr from "ytsr";
import ytdl from "ytdl-core";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, demuxProbe, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import getchannel from "./getchannel";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import stop from "./stop";
import { Message, PartialMessage, TextChannel } from "discord.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { config } from "dotenv";
import internal from "stream";
config();

process.setMaxListeners(0);

const proxy = process.env.PROXY;
let agent: HttpsProxyAgent | undefined = undefined;
if (proxy) agent = new HttpsProxyAgent(proxy);

const mapPlayer: Map<string, AudioPlayer | undefined | null> = new Map();

export async function play(message: M | PM, getsearch?: ytsr.Video) {
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
  if (!guildDB) return;
  let quizDB = client.quizdb(message.guildId!);
  const channelid = guildDB.channelId;
  const guildid = message.guildId!;
  let voicechannel = getchannel(message);
  if (voicechannel) {
    let data: nowplay | undefined = undefined;
    if (getsearch) {
      data = {
        title: getsearch.title,
        author: getsearch.author!.name,
        duration: getsearch.duration!,
        player: `<@${message.author!.id}>`,
        url: getsearch.url,
        image: (getsearch.thumbnails[0].url) ? getsearch.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`
      };
    } else {
      data = quizDB.queue.shift();
    }
    if (data) {
      const checkarea = await getarea(data.url);
      if (checkarea) {
        data.image = data.image.replace('hqdefault', 'maxresdefault');
        quizDB.nowplaying = data;
      } else {
        (message.guild?.channels.cache.get(channelid) as TextChannel).send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '현재 지역에서 영상을 재생할수 없습니다.',
            footer: { text: `Area error` },
            color: 'DARK_RED'
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
      }
      data.image = data.image.replace('hqdefault', 'maxresdefault');
      quizDB.nowplaying = data;
    } else {
      return getVoiceConnection(message.guildId!)?.disconnect();
    }
    quizDB.playing = true;
    client.music.set(message.guildId!, quizDB);
    setmsg(message);
    const connection = joinVoiceChannel({
      adapterCreator: message.guild?.voiceAdapterCreator!,
      guildId: message.guildId!,
      channelId: voicechannel.id
    });
    const Player = createAudioPlayer();
    connection.setMaxListeners(0);
    Player.setMaxListeners(0);
    let ytsource: internal.Readable | undefined = undefined;
    try {
      ytsource = ytdl(data.url, {
        filter: "audioonly",
        quality: 'highestaudio',
        highWaterMark: 1 << 27,
        requestOptions: { agent }
      }).on('error', (err) => {
        if (client.debug) console.log('ytdl-core오류1:', err);
        return undefined;
      });
    } catch {
      let ytsource2: internal.Readable | undefined = undefined;
      try {
        ytsource2 = ytdl(data.url, {
          filter: "audioonly",
          quality: 'highestaudio',
          highWaterMark: 1 << 25,
          requestOptions: { agent }
        }).on('error', (err) => {
          if (client.debug) console.log('ytdl-core오류2:', err);
          return undefined;
        });
      } catch {}
      ytsource = ytsource2;
    }
    if (!ytsource) {
      await stopPlayer(message.guildId!);
      setTimeout(() => play(message, undefined), 50);
      return;
    }
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
        stopPlayer(guildid);
      }
    }
    const resource = createAudioResource(ytsource, { inlineVolume: true, inputType: StreamType.Arbitrary });
    resource.volume?.setVolume((guildDB.options.volume) ? guildDB.options.volume / 100 : 0.7);
    Player.play(resource);
    const subscription = connection.subscribe(Player);
    mapPlayer.set(guildid, Player);
    // connection.on(VoiceConnectionStatus.Ready, () => {
    //   // 봇 음성채널에 접속
    // });
    Player.on(AudioPlayerStatus.Idle, async (P) => {
      // 봇 노래 재생 끝났을때
      Player.stop();
      await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
      play(message, undefined);
    });
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      // 봇 음성채널에서 퇴장
      stop(message);
      stopPlayer(guildid);
    });
    connection.on('error', (err) => {
      if (client.debug) console.log('connection오류:', err);
      (message.guild?.channels.cache.get(channelid) as TextChannel).send({ embeds: [
        client.mkembed({
          title: `오류발생`,
          description: '영상을 재생할수 없습니다.\n다시 시도해주세요.',
          footer: { text: `connection error` },
          color: 'DARK_RED'
        })
      ] }).then(m => client.msgdelete(m, 3000, true));
      stopPlayer(guildid);
    });
    Player.on('error', (err) => {
      if (client.debug) console.log('Player오류:', err);
      (message.guild?.channels.cache.get(channelid) as TextChannel).send({ embeds: [
        client.mkembed({
          title: `오류발생`,
          description: '영상을 재생할수 없습니다.\n다시 시도해주세요.',
          footer: { text: `Player error` },
          color: 'DARK_RED'
        })
      ] }).then(m => client.msgdelete(m, 3000, true));
      stopPlayer(guildid);
    });
  } else {
    return message.channel.send({ embeds: [
      client.mkembed({
        title: '음성채널을 찾을수 없습니다.',
        description: '음성채널에 들어가서 사용해주세요.',
        color: 'DARK_RED'
      })
    ] }).then(m => client.msgdelete(m, 1));
  }
}

export function pause(message: M | PM) {
  const Player = mapPlayer.get(message.guildId!);
  if (Player) {
    if (Player.state.status === AudioPlayerStatus.Playing) {
      Player.pause();
      setmsg(message, true);
    } else {
      Player.unpause();
      setmsg(message);
    }
  }
}

// export async function skipPlayer(message: M | PM) {
//   const Player = mapPlayer.get(message.guildId!);
//   const connection = getVoiceConnection(message.guildId!);
//   if (Player) {
//     if (connection) {
//       Player.stop();
//       await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
//       play(message);
//     } else {
//       mapPlayer.set(message.guildId!, undefined);
//       Player.stop();
//     }
//   }
// }

export async function stopPlayer(guildId: string) {
  const Player = mapPlayer.get(guildId);
  if (Player) {
    mapPlayer.set(guildId, undefined);
    Player.stop();
  }
}

export async function getarea(url: string) {
  const info = await ytdl.getInfo(url).catch((err) => {
    return undefined;
  });
  if (info) {
    return info.videoDetails.availableCountries.includes('KR');
  }
  return false;
}