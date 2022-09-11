import BotClient from "./classes/BotClient";
import SlashHandler from "./classes/Handler";

import onReady from "./events/onReady";
import onInteractionCreate from "./events/onInteractionCreate";
import onMessageCreate from "./events/onMessageCreate";
import guildDelete from "./events/guildDelete";
import voiceStateUpdate from "./events/voiceStateUpdate";
import onmessageReactionAdd from "./events/onmessageReactionAdd";

// 봇 클라이언트 생성
export const client = new BotClient();
export const handler = new SlashHandler();

// 이벤트 로딩
client.onEvent('ready', onReady);
client.onEvent('interactionCreate', onInteractionCreate);
client.onEvent('messageCreate', onMessageCreate);
client.onEvent('guildDelete', guildDelete);
client.onEvent('voiceStateUpdate', voiceStateUpdate);
client.onEvent('messageReactionAdd', onmessageReactionAdd);
