import { handler } from '..';
import { Message } from 'discord.js';

export default async function onMessageCreate (message: Message) {
  handler.msgrunCommand(message);
}