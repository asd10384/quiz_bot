import { client } from "..";
import { getVoiceConnection } from "@discordjs/voice";
import { M, PM } from "../aliases/discord.js.js";
import MDB from "../database/Mongodb";
import setmsg from "./msg";

export default async function stop(message: M | PM) {
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
  if (!guildDB) return;
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
  client.quiz.set(message.guildId!, quizDB);
  setmsg(message);
  getVoiceConnection(message.guildId!)?.disconnect();
}