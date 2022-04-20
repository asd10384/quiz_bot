import { client } from "../index";
import { Guild } from "discord.js";

export async function shuffle(guild: Guild) {
  const qc = client.getqc(guild);
  qc.setqueue(fshuffle(qc.queue));
  qc.setmsg(guild);
}

export function fshuffle(list: any[]) {
  var j, x, i;
  for (i=list.length; i; i-=1) {
    j = Math.floor(Math.random() * i);
    x = list[i-1];
    list[i-1] = list[j];
    list[j] = x;
  }
  return list;
}