import BotClient from "./classes/BotClient";
import SlashHandler from "./classes/Handler";

import onReady from "./events/onReady";
import onInteractionCreate from "./events/onInteractionCreate";
import onMessageCreate from "./events/onMessageCreate";
import onmessageReactionAdd from "./events/onmessageReactionAdd";

// 봇 클라이언트 생성
export const client = new BotClient();
export const handler = new SlashHandler();

client.onEvent('ready', onReady);
client.onEvent('interactionCreate', onInteractionCreate);
client.onEvent('messageCreate', onMessageCreate);
client.onEvent('messageReactionAdd', onmessageReactionAdd);