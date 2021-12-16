import { createAudioResource, entersState, AudioPlayerStatus, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus, StreamType, createAudioPlayer } from "@discordjs/voice";
import { client } from "..";
import { M, PM } from "../aliases/discord.js";
import setmsg from "./msg";
import quiz_stop from "./stop";
import ytdl from "ytdl-core";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getbotchannel, getuserchannel } from "./getchannel";
import { StageChannel, VoiceChannel } from "discord.js";
import internal from "stream";
import { reset_skip } from "./skip";
import { reset_hint } from "./hint";
import quiz_anser from "./anser";
import bulkmessage from "./bulkmessage";

const proxy = process.env.PROXY;
let agent: HttpsProxyAgent | undefined = undefined;
if (proxy) agent = new HttpsProxyAgent(proxy);

export default async function quiz(message: M | PM, userId: string) {
  var voicechannel: VoiceChannel | StageChannel | null | undefined = undefined;
  var connection = getVoiceConnection(message.guildId!);
  if (!connection) voicechannel = getbotchannel(message);
  if (!connection && !voicechannel) voicechannel = getuserchannel(message.guild?.members.cache.get(userId));
  if (!connection && !voicechannel) return message.channel.send({ embeds: [
    client.mkembed({
      title: `\` 음성 오류 \``,
      description: `음성채널을 찾을수 없습니다.`,
      color: "DARK_RED"
    })
  ] }).then(m => client.msgdelete(m, 1));
  const quizDB = client.quizdb(message.guildId!);
  if (quizDB.count[0] > quizDB.count[1]) return quiz_stop(message);
  const data = quizDB.queue.shift();
  if (!data) return quiz_stop(message);
  quizDB.nowplaying = data;
  quizDB.playing = true;
  quizDB.anser = null;
  quizDB.image = (quizDB.type.customimg) 
    ? `${process.env.MUSIC_SITE}/customimg/${quizDB.page.page.slice(0,-1).join("/")}/${quizDB.nowplaying?.name}.png`
    || `${process.env.MUSIC_SITE}/customimg/${quizDB.page.page.slice(0,-1).join("/")}/${quizDB.nowplaying?.name}.png`
    : `https://img.youtube.com/vi/${quizDB.nowplaying?.link.replace("https://youtu.be/","")}/sddefault.jpg`;
  client.quiz.set(message.guildId!, quizDB);
  bulkmessage(message);
  setmsg(message);
  if (!connection) connection = joinVoiceChannel({
    adapterCreator: message.guild!.voiceAdapterCreator!,
    channelId: voicechannel!.id,
    guildId: message.guildId!
  });
  const Player = createAudioPlayer();
  connection.setMaxListeners(0);
  Player.setMaxListeners(0);
  Player.on("error", (err) => {
    if (client.debug) console.log("Player 오류:", err);
    Player.stop();
    return quiz_anser(message, ["스킵", "오류"], userId);
  });
  var ytsource: internal.Readable | undefined = undefined;
  try {
    if (client.debug) console.log(`${message.guild?.name} {\n  get: ${quizDB.page.page.slice(0,-1).join("/")}\n  number: ${quizDB.count[0]}\n  realnumber: ${quizDB.nowplaying.realnumber+1}\n  name: ${quizDB.nowplaying.vocal}-${quizDB.nowplaying.name}\n  link: ${quizDB.nowplaying.link}\n}`);
    ytsource = ytdl(quizDB.nowplaying.link, {
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
    return quiz_anser(message, ["스킵", "오류"], userId);
  }
  await entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
  const resource = createAudioResource(ytsource, {
    inlineVolume: true, inputType: StreamType.Arbitrary
  });
  resource.volume?.setVolume(0.7);
  Player.play(resource);
  const subscription = connection.subscribe(Player);
  reset_skip(message.guildId!, true);
  reset_hint(message.guildId!, true);
  Player.on(AudioPlayerStatus.Idle, async (p) => {
    Player.stop();
    quiz_anser(message, ["스킵", "시간초과"], userId);
  });
  connection.on(VoiceConnectionStatus.Disconnected, () => {
    Player.stop();
    quiz_stop(message);
    connection?.disconnect();
  });
}