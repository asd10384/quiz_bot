import { config } from "dotenv";
import { client, handler } from "..";

config();

/** onReady 핸들러 */
export default function onReady() {
  if (!client.user) return;

  const prefix = client.prefix;
  let actlist: { text: string, time: number }[] = eval(process.env.ACTIVITY!);

  console.log('Ready!', client.user.username);
  console.log('Activity:', JSON.stringify(actlist));
  console.log('로그확인:', client.debug);

  if (process.env.REFRESH_SLASH_COMMAND_ON_READY === 'true') handler.registCachedCommands(client);

  client.user.setActivity(actlist[0].text);
  let i = 1;
  let time = actlist[1].time;
  setInterval(() => {
    client.user?.setActivity(actlist[i].text);
    if (++i >= actlist.length) i = 0;
    time = actlist[i].time;
  }, time * 1000);
}