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
  overLapQueue: string[];
  options: {
    onetimemax: number;
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
  overLapQueue?: string[];
  options?: {
    onetimemax: number;
    nexttime: number;
  };
}

/** User DB */
export interface userData {
  id: string;
  name: string;
  guildList: string[];
}
interface getuserData {
  id?: string;
  name?: string;
  guildList?: string[];
}

/** Guild DB */
const guild_get = (guild: Guild) => new Promise<guildData>(async (res, _rej) => {
  let get = await qdb.table("guild").get<guildData>("s"+guild.id);
  if (get) {
    get.name = guild.name;
    return res(get);
  }
  let data: guildData = {
    id: guild.id,
    prefix: client.prefix,
    name: guild.name,
    role: [],
    channelId: "",
    msgId: "",
    scoreId: "",
    overLapQueue: [],
    options: {
      onetimemax: 50,
      nexttime: 10
    }
  };
  await qdb.table("guild").set("s"+guild.id, data).catch(() => {});
  return res(data);
});

const guild_set = (guild: Guild, getqdb: getguildData) => new Promise<boolean>(async (res, _rej) => {
  const get = await guild_get(guild);
  await qdb.table("guild").set("s"+guild.id, {
    ...get,
    ...getqdb
  }).then(() => {
    return res(true);
  }).catch(() => {
    return res(false);
  });
});

const guild_del = (guildId: string) => new Promise<boolean>(async (res, _rej) => {
  await qdb.table("guild").delete("s"+guildId).then(() => {
    return res(true);
  }).catch(() => {
    return res(false);
  });
});

const guild_all = () => new Promise<guildData[]>(async (res, _rej) => {
  await qdb.table("guild").all().then((data) => {
    return res(data.map(val => val.value));
  }).catch(() => {
    return res([]);
  });
});



/** User DB */
const user_get = (guild: Guild, member: GuildMember) => new Promise<userData>(async (res, _rej) => {
  await guild_get(guild).catch(() => {});
  let get = await qdb.table("user").get<userData>("s"+member.id);
  if (get) {
    if (!get.guildList.includes(guild.id)) get.guildList.push(guild.id);
    get.name = member.user.tag;
    return res(get);
  }
  let data: userData = {
    id: member.id,
    name: member.user.tag,
    guildList: []
  };
  await qdb.table("user").set("s"+member.id, data).catch(() => {});
  return res(data);
});

const user_set = (guild: Guild, member: GuildMember, getqdb: getuserData) => new Promise<boolean>(async (res, _rej) => {
  const get = await user_get(guild, member);
  await qdb.table("user").set("s"+member.id, {
    ...get,
    ...getqdb
  }).then(() => {
    return res(true);
  }).catch(() => {
    return res(false);
  });
});

const user_del = (guildId: string, userId: string) => new Promise<boolean>(async (res, _rej) => {
  await qdb.table("user").get<userData>("s"+userId).then(async (data) => {
    if (data?.guildList.includes(guildId)) {
      data.guildList = data.guildList.filter(val => val != guildId);
      await qdb.table("user").set("s"+userId, data).then(() => {
        return res(true);
      }).catch(() => {
        return res(false);
      });
    }
  }).catch(() => {
    return res(false);
  });
});

const user_all = (guildId: string) => new Promise<userData[]>(async (res, _rej) => {
  await qdb.table("user").all().then((data) => {
    return res(data.map(val => val.value).filter((val: userData) => val.guildList.includes(guildId)));
  }).catch(() => {
    return res([]);
  });
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