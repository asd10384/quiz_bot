import { client } from "..";
import ytsr from "ytsr";
import ytpl from "ytpl";
import MDB from "../database/Mongodb";
import { nowplay } from "../database/obj/guild";
import { M } from "../aliases/discord.js.js";
import setmsg from "./msg";

type Vtype = "video" | "playlist" | "database";
type Etype = "notfound" | "added";

const inputplaylist = new Set<string>();

export default async function search(message: M, text: string): Promise<[ytsr.Item | undefined, { type?: Vtype, err?: Etype, addembed?: M }]> {
  if (inputplaylist.has(message.guildId!)) return [ undefined, { type: "playlist", err: "added" } ];
  let url = checkurl(text);
  if (url.video) {
    let yid = url.video[1].replace(/\&.+/g,'');
    let list = await ytsr(`https://www.youtube.com/watch?v=${yid}`, {
      gl: 'KR',
      hl: 'ko',
      limit: 1
    }).catch((err) => {
      return undefined;
    });
    if (list && list.items) {
      return [ list.items[0], { type: "video" } ];
    } else {
      return [ undefined, { type: "video", err: "notfound" } ];
    }
  } else if (url.list) {
    let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
    if (!guildDB) return [ undefined, { type: "database", err: "notfound" } ];
    
    inputplaylist.add(message.guildId!);
    
    let quizDB = client.quizdb(message.guildId!);

    const addedembed = await message.channel.send({ embeds: [
      client.mkembed({
        description: `<@${message.author.id}> 플레이리스트 확인중...\n(노래가 많으면 많을수록 오래걸립니다.)`,
        color: client.embedcolor
      })
    ] });

    let yid = url.list[1].replace(/\&.+/g,'');
    let list = await ytpl(yid, {
      limit: 50000 // (guildDB.options.listlimit) ? guildDB.options.listlimit : 300
    }).catch((err) => {
      return undefined;
    });
    addedembed.delete();
    if (list && list.items && list.items.length > 0) {
      if (client.debug) console.log(message.guild?.name, list.title, list.items.length, (guildDB.options.listlimit) ? guildDB.options.listlimit : 300);
      const addembed = await message.channel.send({ embeds: [
        client.mkembed({
          title: `\` ${list.title} \` 플레이리스트 추가중...`,
          description: `재생목록에 \` ${list.items.length} \` 곡 추가중`,
          color: client.embedcolor
        })
      ] });
      if (quizDB.playing) {
        let queuelist: nowplay[] = [];
        list.items.forEach((data) => {
          queuelist.push({
            title: data.title,
            duration: data.duration!,
            author: data.author.name,
            url: data.shortUrl,
            image: (data.thumbnails[0].url) ? data.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
            player: `<@${message.author.id}>`
          });
        });
        quizDB.queue = quizDB.queue.concat(queuelist);
        client.music.set(message.guildId!, quizDB);
        setmsg(message);
        inputplaylist.delete(message.guildId!);
        return [ undefined, { type: "playlist", addembed: addembed } ];
      } else {
        let output = list.items.shift();
        let queuelist: nowplay[] = [];
        list.items.forEach((data) => {
          queuelist.push({
            title: data.title,
            duration: data.duration!,
            author: data.author.name,
            url: data.shortUrl,
            image: (data.thumbnails[0].url) ? data.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
            player: `<@${message.author.id}>`
          });
        });
        quizDB.queue = quizDB.queue.concat(queuelist);
        client.music.set(message.guildId!, quizDB);
        if (!output) {
          inputplaylist.delete(message.guildId!);
          return [ undefined, { type: "video", err: "notfound", addembed: addembed } ];
        }
        let getyt = await ytsr(output.shortUrl, {
          gl: 'KO',
          hl: 'KR',
          limit: 1
        });
        inputplaylist.delete(message.guildId!);
        return [ getyt.items[0], { type: "video", addembed: addembed } ];
      }
    } else {
      return [ undefined, { type: "playlist", err: "notfound" } ];
    }
  } else {
    let list = await ytsr(text, {
      gl: 'KO',
      hl: 'KR',
      limit: 1
    });
    if (list && list.items && list.items.length > 0) {
      return [ list.items[0], { type: "video" } ];
    } else {
      return [ undefined, { type: "video", err: "notfound" } ];
    }
  }
}

function checkurl(text: string) {
  var checkvideo = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  var checklist = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:playlist\?list=))((\w|-).+)(?:\S+)?$/;
  return {
    video: text.match(checkvideo),
    list: text.match(checklist)
  };
}
