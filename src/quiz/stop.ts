import { client } from "..";
import { getVoiceConnection } from "@discordjs/voice";
import { M, PM } from "../aliases/discord.js.js";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import { TextChannel } from "discord.js";

export default async function quiz_stop(message: M | PM) {
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
  if (!guildDB) return;
  var channel = message.guild?.channels.cache.get(guildDB.channelId) as TextChannel;
  var msg = channel.messages.cache.get(guildDB.msgId);
  msg?.reactions.removeAll();
  let quizDB = client.quizdb(message.guildId!);
  quizDB.playing = false;
  quizDB.queue = [];
  quizDB.nowplaying = {
    anser: false,
    author: '',
    duration: '',
    player: '',
    title: '',
    url: '',
    image: ''
  };
  quizDB.page = {
    first: true,
    go: null,
    list: [],
    now: 0,
    page: [],
    player: null,
    maxpage: 1
  };
  client.quiz.set(message.guildId!, quizDB);
  setmsg(message);
  getVoiceConnection(message.guildId!)?.disconnect();
}