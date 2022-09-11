import { Guild } from "discord.js";
import { client } from "../index";
import { QuickDB } from "quick.db";
const qdb = new QuickDB({
  filePath: process.env.DBFILEPATH || "./dbfile.sqlite"
});

export default {
  get,
  set,
  del,
  all
}

export interface qdbdata {
  id: string;
  name: string;
  prefix: string;
  role: string[];
  channelId: string;
  scoreId: string;
  msgId: string;
  options: {
    anser: string;
    nexttime: number;
  };
}
interface getdbdata {
  id?: string;
  name?: string;
  prefix?: string;
  role?: string[];
  channelId?: string;
  scoreId?: string;
  msgId?: string;
  options?: {
    anser: string;
    nexttime: number;
  };
  [key: string]: any;
}

function get(guild: Guild) {
  return new Promise<qdbdata>(async (res, rej) => {
    qdb.table("s"+guild.id).all().then(async (qdbdata) => {
      let output: {[key: string]: any} = {};
      if (qdbdata.length === 0 || qdbdata.some((val) => val.id !== "id")) {
        let serverlist: string[] = await qdb.get("ids") || [];
        if (!serverlist.includes(guild.id)) {
          serverlist.push(guild.id);
          await qdb.set("ids", serverlist);
        }
        let data: qdbdata = {
          id: guild.id,
          name: "",
          prefix: client.prefix,
          channelId: "",
          msgId: "",
          scoreId: "",
          role: [],
          options: {
            anser: "",
            nexttime: 10
          }
        };
        output = data;
      }
      for (let val of qdbdata) {
        output[val.id] = val.value;
      }
      output["name"] = guild.name;
      await set(guild.id, output);
      return res(output as any);
    }).catch(rej);
  });
}

function set(guildId: string, getqdb: getdbdata) {
  return new Promise<boolean>(async (res, rej) => {
    try {
      const keys = Object.keys(getqdb);
      for (let key of keys) {
        await qdb.table("s"+guildId).set(key, getqdb[key]);
      }
      return res(true);
    } catch (err) {
      return rej(err);
    }
  });
}

function del(guildId: string) {
  return new Promise<boolean>((res, rej) => {
    qdb.table("s"+guildId).deleteAll().then(async (val) => {
      let serverlist: string[] = await qdb.get("ids") || [];
      await qdb.set("ids", serverlist.filter(id => id !== guildId));
      return res(true);
    }).catch(rej);
  });
}

function all() {
  return new Promise<qdbdata[]>(async (res, rej) => {
    try {
      let serverlist: string[] = await qdb.get("ids") || [];
      let output: qdbdata[] = [];
      for (let guildId of serverlist) {
        let qdbdata = await qdb.table("s"+guildId).all();
        let output2: {[key: string]: any} = {};
        for (let val of qdbdata) {
          output2[val.id] = val.value;
        }
        output.push(output2 as any);
      }
      return res(output);
    } catch (err) {
      return rej(err);
    }
  });
}