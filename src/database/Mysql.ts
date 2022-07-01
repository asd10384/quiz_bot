import "dotenv/config";
import { Guild, GuildMember } from "discord.js";
import mysql from "mysql";
import { client } from "../index.js";

export const BOT_NUMBER = (process.env.BOT_NUMBER) ? process.env.BOT_NUMBER : '';

var connection: mysql.Connection | undefined = undefined;

Connect();
function Connect() {
  if (connection) connection.end();
  connection = mysql.createConnection({
    host: process.env.MYSQL_HOST ? process.env.MYSQL_HOST : 'localhost',
    port: parseInt(process.env.MYSQL_PORT ? process.env.MYSQL_PORT : "3306"),
    user: process.env.MYSQL_USER ? process.env.MYSQL_USER : "root",
    password: process.env.MYSQL_PASSWORD ? process.env.MYSQL_PASSWORD : "",
    database: process.env.MYSQL_DATABASE ? process.env.MYSQL_DATABASE+BOT_NUMBER : ""
  });
  
  connection.connect((err) => {
    if (err) {
      console.log(`데이터베이스 오류, 2초후 재접속\n오류코드:`, err);
      setTimeout(Connect, 2000);
    }
    console.log(`MYSQL 데이터베이스 연결 성공`);
  });

  connection.on("error", (err) => {
    if (client.debug) console.log("데이터베이스 오류:", err);
    Connect();
  });
}

async function command(text: string): Promise<any> {
  return new Promise((suc, unsuc) => {
    if (!connection) {
      return unsuc("데이터베이스를 찾을수없음");
    }
    connection.query(text, (err, res) => {
      if (err) return unsuc(err);
      return suc(res);
    });
  });
}

export interface nowplay {
  nowplaycheck: boolean;
  name: string;
  vocal: string;
  link: string;
};

export interface music {
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[];
  queuenumber: number[];
};

interface options {
  volume: number;
  anser: string;
  nexttime: number;
};

interface guild_list_type {
  id?: string;
  name?: string;
  prefix?: string;
  role?: string;
  channelId?: string;
  msgId?: string;
  scoreId?: string;
  options?: string;
}
interface guild_first_type {
  id: string;
  name: string;
  prefix: string;
  role: string;
  channelId: string;
  msgId: string;
  scoreId: string;
  options: string;
}
export interface guild_type {
  id: string;
  name: string;
  prefix: string;
  role: string[];
  channelId: string;
  msgId: string;
  scoreId: string;
  options: options;
}

interface user_list_type {
  id?: string;
  tag?: string;
}
interface user_first_type {
  id: string;
  tag: string;
}
export interface user_type {
  id: string;
  tag: string;
}

async function get_guildDB(guild: Guild): Promise<guild_type | undefined> {
  const guildDBlist = await command(`select * from guild where id='${guild.id}'`);
  if (guildDBlist.length > 0) {
    const guildDB: guild_first_type = guildDBlist[0];
    if (guildDB.name !== guild.name) guildDB.name = guild.name;
    return {
      id: guildDB.id,
      name: guildDB.name,
      prefix: guildDB.prefix,
      role: JSON.parse(guildDB.role),
      channelId: guildDB.channelId,
      msgId: guildDB.msgId,
      scoreId: guildDB.scoreId,
      options: JSON.parse(guildDB.options)
    };
  } else {
    return await command(`insert into \`guild\` (${[
      "id",
      "name",
      "prefix",
      "role",
      "channelId",
      "msgId",
      "scoreId",
      "options"
    ].join(",")}) values('${[
      guild.id.toString(),
      guild.name,
      (process.env.PREFIX) ? process.env.PREFIX : 't;',
      "[]",
      "",
      "",
      "",
      JSON.stringify({
        volume: 50,
        anser: "제목",
        nexttime: 10
      })
    ].join("','")}')`).then((guildDB): guild_type => {
      return {
        id: guild.id.toString(),
        name: guild.name,
        prefix: (process.env.PREFIX) ? process.env.PREFIX : 'q;',
        role: [],
        channelId: "",
        msgId: "",
        scoreId: "",
        options: {
          volume: 50,
          anser: "제목",
          nexttime: 10
        }
      };
    }).catch((err) => {
      if (client.debug) console.log(err);
      return undefined;
    });
  }
}

async function get_userDB(member: GuildMember): Promise<user_type | undefined> {
  const userDBlist = await command(`select * from user where id='${member.user.id}'`);
  if (userDBlist.length > 0) {
    let userDB: user_first_type = userDBlist[0];
    if (userDB.tag !== member.user.tag) userDB.tag = member.user.tag;
    return {
      id: userDB.id,
      tag: userDB.tag
    };
  } else {
    return await command(`insert into \`user\` (${[
      "id",
      "tag"
    ].join(",")}) values('${[
      member.user.id.toString(),
      member.user.tag
    ].join("','")}')`).then((userDB): user_type => {
      return {
        id: member.user.id.toString(),
        tag: member.user.tag
      };
    }).catch((err) => {
      if (client.debug) console.log(err);
      return undefined;
    });
  }
}

async function update_guildDB(guildId: string, data: guild_list_type): Promise<boolean> {
  let keys = Object.keys(data);
  let values = Object.values(data);
  let addlist = [];
  for (let i in keys) {
    addlist.push(`${keys[i]}=${
      typeof(values[i]) === "string" ? `'${values[i]}'` : values[i]
    }`);
  }
  return await command(`update guild set ${addlist.join(",")} where id='${guildId}'`).then((val) => {
    return true;
  }).catch((err) => {
    return false;
  });
}

async function update_userDB(userId: string, data: user_list_type): Promise<boolean> {
  let keys = Object.keys(data);
  let values = Object.values(data);
  let addlist = [];
  for (let i in keys) {
    addlist.push(`${keys[i]}=${
      typeof(values[i]) === "string" ? `'${values[i]}'` : values[i]
    }`);
  }
  return await command(`update user set ${addlist.join(",")} where id='${userId}'`).then((val) => {
    return true;
  }).catch((err) => {
    return false;
  });
}

export default {
  get: {
    guild: get_guildDB,
    user: get_userDB
  },
  update: {
    guild: update_guildDB,
    user: update_userDB
  },
  command
};