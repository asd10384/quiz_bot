import "dotenv/config";
import { Guild, GuildMember } from "discord.js";
import { QuickDB } from "quick.db";
import { client } from "..";

const qdb = new QuickDB({
  filePath: process.env.DB_FILE_PATH || "./dbfile.sqlite"
});

/** Guild DB */
export interface guildData {
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
interface getguildData {
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
}

/** User DB */
export interface userData {
  id: string;
  name: string;
}
interface getuserData {
  id?: string;
  name?: string;
}

/** Guild DB */
const guild_set = (guildId: string, getqdb: getguildData) => new Promise<boolean>(async (res, rej) => {
  try {
    for (const key of Object.keys(getqdb)) {
      await qdb.table("s"+guildId).set(key, (getqdb as any)[key]);
    }
    return res(true);
  } catch (err) {
    return rej(err);
  }
});

const guild_get = (guild: Guild) => new Promise<guildData>((res, rej) => {
  qdb.table("s"+guild.id).all().then(async (guildData) => {
    let output: {[key: string]: any} = {};
    if (guildData.length === 0 || guildData.some((val) => val.id !== "id")) {
      let serverlist: string[] = await qdb.get("ids") || [];
      if (!serverlist.includes(guild.id)) {
        serverlist.push(guild.id);
        await qdb.set("ids", serverlist);
      }
      let data: guildData = {
        id: guild.id,
        prefix: client.prefix,
        name: "",
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
    for (let val of guildData) {
      output[val.id] = val.value;
    }
    output["name"] = guild.name;
    await guild_set(guild.id, output as any);
    return res(output as any);
  }).catch(rej);
});

const guild_del = (guildId: string) => new Promise<boolean>((res, rej) => {
  qdb.table("s"+guildId).deleteAll().then(async () => {
    let serverlist: string[] = await qdb.get("ids") || [];
    await qdb.set("ids", serverlist.filter(id => id !== guildId));
    return res(true);
  }).catch(rej);
});

const guild_all = () => new Promise<guildData[]>(async (res, rej) => {
  try {
    let serverlist: string[] = await qdb.get("ids") || [];
    let output: guildData[] = [];
    for (let guildId of serverlist) {
      let guilddata = await qdb.table("s"+guildId).all();
      let output2: {[key: string]: any} = {};
      for (let val of guilddata) {
        output2[val.id] = val.value;
      }
      output.push(output2 as any);
    }
    return res(output);
  } catch (err) {
    return rej(err);
  }
});


/** User DB */
const user_set = (guildId: string, userId: string, getqdb: getuserData) => new Promise<boolean>(async (res, rej) => {
  try {
    for (const key of Object.keys(getqdb)) {
      await qdb.table("s"+guildId).table("u"+userId).set(key, (getqdb as any)[key]);
    }
    return res(true);
  } catch (err) {
    return rej(err);
  }
});

const user_get = (guild: Guild, member: GuildMember) => new Promise<userData>(async (res, rej) => {
  await guild_get(guild).catch(rej);
  qdb.table("s"+guild.id).table("u"+member.id).all().then(async (userData) => {
    let output: {[key: string]: any} = {};
    if (userData.length === 0 || userData.some((val) => val.id !== "id")) {
      let userlist: string[] = await qdb.table("s"+guild.id).get("idu") || [];
      if (!userlist.includes(guild.id)) {
        userlist.push(guild.id);
        await qdb.table("s"+guild.id).set("idu", userlist);
      }
      let data: userData = {
        id: member.id,
        name: ""
      };
      output = data;
    }
    for (let val of userData) {
      output[val.id] = val.value;
    }
    output["name"] = member.nickname || member.user.username;
    await user_set(guild.id, member.id, output as any);
    return res(output as any);
  }).catch(rej);
});

const user_del = (guildId: string, userId: string) => new Promise<boolean>((res, rej) => {
  qdb.table("s"+guildId).table("u"+userId).deleteAll().then(async () => {
    let userlist: string[] = await qdb.table("s"+guildId).get("idu") || [];
    await qdb.table("s"+guildId).set("idu", userlist.filter(id => id !== userId));
    return res(true);
  }).catch(rej);
});

const user_all = (guildId: string) => new Promise<guildData[]>(async (res, rej) => {
  try {
    let userlist: string[] = await qdb.table("s"+guildId).get("idu") || [];
    let output: guildData[] = [];
    for (let userId of userlist) {
      let guilddata = await qdb.table("s"+guildId).table("u"+userId).all();
      let output2: {[key: string]: any} = {};
      for (let val of guilddata) {
        output2[val.id] = val.value;
      }
      output.push(output2 as any);
    }
    return res(output);
  } catch (err) {
    return rej(err);
  }
});

export const QDB = {
  guild: {
    get: guild_get,
    set: guild_set,
    del: guild_del,
    all: guild_all
  },
  user: {
    get: user_get,
    set: user_set,
    del: user_del,
    all: user_all
  }
};