import request from "request";
import { config } from "dotenv";
config();

interface body {
  url: string;
  desc: string;
  quiz: string;
  customimg: string;
  space: boolean;
  complite: number;
  start: boolean;
};

interface page {
  [key: string]: {
    [key: string]: {
      [key: string]: body;
    }
  }
};

async function start(page: { now: string[] }, first?: boolean): Promise<any> {
  const music_list = `${process.env.MUSIC_SITE}/music_list.js`;
  request(music_list, async (err: any, res: any, body: string) => {
    const data: page = eval(body)[0];
    var list: string[] = [];
    var getkey: string[] = [];
    var getvalue: body | null = null;
    switch (page.now.length) {
      case 0:
        getkey = Object.keys(data);
        break;
      case 1:
        getkey = Object.keys(data[page.now[0]]);
        break;
      case 2:
        getkey = Object.keys(data[page.now[0]][page.now[1]]);
        break;
      case 3:
        getkey = Object.keys(data[page.now[0]][page.now[1]][page.now[2]]);
        getvalue = data[page.now[0]][page.now[1]][page.now[2]];
        break;
    }
    console.log(getkey);
    console.log(getvalue);
  });
}

start({ now: [ "K-POP", "MIX-B" ] });