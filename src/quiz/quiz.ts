import { client } from "..";
import { I, M } from "../aliases/discord.js.js";
import MDB from "../database/Mongodb";

export default async function quiz(message: M, text: string) {
  
}

async function start(message: M, page?: number): Promise<any> {
  const guildDB = await MDB.get.guild(message)!;
  const quizDB = client.quizdb(message.guildId!);
  
}