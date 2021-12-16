import { client } from "..";
import { getVoiceConnection } from "@discordjs/voice";
import { I, M, PM } from "../aliases/discord.js.js";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import { TextChannel } from "discord.js";
import { reset_skip } from "./skip";
import { reset_hint } from "./hint";
import bulkmessage from "./bulkmessage";

export default async function quiz_stop(message: M | PM | I, no?: boolean) {
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
  if (!guildDB) return;
  var channel = message.guild?.channels.cache.get(guildDB.channelId) as TextChannel;
  var msg = channel.messages.cache.get(guildDB.msgId);
  msg?.reactions.removeAll();
  let quizDB = client.quizdb(message.guildId!);
  quizDB.playing = false;
  quizDB.queue = [];
  quizDB.nowplaying = {
    name: "",
    vocal: "",
    link: ""
  };
  quizDB.count = [ 1, 1 ];
  quizDB.page = {
    first: true,
    go: null,
    list: [],
    now: 0,
    page: [],
    player: null,
    maxpage: 1
  };
  quizDB.score.clear();
  reset_skip(message.guildId!, false);
  reset_hint(message.guildId!, false);
  client.quiz.set(message.guildId!, quizDB);
  if (!no) bulkmessage(message);
  setmsg(message);
  getVoiceConnection(message.guildId!)?.disconnect();
}