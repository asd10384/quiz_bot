import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { client } from "..";
import { guildData } from "../databases/Quickdb";

export const QUIZ_RULE = (guildDB: guildData): string => {
  const list = [
    `명령어는 \` ${client.prefix}퀴즈 도움말 \`로 확인할수 있습니다.`,
    `정답은 채팅창에 그냥 입력하시면 됩니다.`,
    `정답을 맞추고 몇초뒤에 다음문제로 넘어갈지 설정할수 있습니다. (현재 : ${guildDB.options.nexttime}초)
      (시간 설정은 **${client.prefix}퀴즈 설정 도움말**을 참고해주세요.)`,
    `노래퀴즈는 노래가 끝나도 정답을 맞추지 못할시 자동으로 스킵됩니다.
      (노래퀴즈의 제목 및 가수는 오피셜(멜론) 명칭을 사용했습니다.)
      (띄어쓰기나 특수문자 (ex: ') 를 유의하여 적어주세요.)`,
    `오류나 수정사항은 **\` tmdgks0466@naver.com \`**으로 보내주세요.
      
    퀴즈 도중 봇이 멈추거나 오류가 생겼다면
    퀴즈를 종료하고 다시 시작하거나, (**${client.prefix}퀴즈 종료**)
    **${client.prefix}퀴즈 fix**를 입력해주세요.
    
    음성 채널에 참여한 후 **\` ${client.prefix}퀴즈 시작 \`**을 입력해 퀴즈를 시작하세요.`
  ];

  var output = "";
  list.forEach((text, i) => {
    output += `**${i+1}.** ${text.trim().replace(/ +/g, ' ')}\n`;
  });
  return output;
}

export const BUTTONS_DEFAULT = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-ready")
    .setLabel("시작하기")
    .setStyle(ButtonStyle.Success)
);

export const BUTTONS_READY = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-1")
    .setLabel("1")
    .setStyle(ButtonStyle.Primary)
).addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-2")
    .setLabel("2")
    .setStyle(ButtonStyle.Primary)
).addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-3")
    .setLabel("3")
    .setStyle(ButtonStyle.Primary)
).addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-4")
    .setLabel("4")
    .setStyle(ButtonStyle.Primary)
).addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-5")
    .setLabel("5")
    .setStyle(ButtonStyle.Primary)
);

export const BUTTONS_READY2 = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-left")
    .setLabel("이전 페이지")
    .setStyle(ButtonStyle.Secondary)
).addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-stop")
    .setLabel("퀴즈종료")
    .setStyle(ButtonStyle.Danger)
).addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-right")
    .setLabel("다음 페이지")
    .setStyle(ButtonStyle.Secondary)
);

export const BUTTONS_START = (disHint: boolean = false, disSkip: boolean = false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-hint")
    .setEmoji({ name: "💡" })
    .setLabel("힌트")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disHint)
).addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-skip")
    .setEmoji({ name: "⏭️" })
    .setLabel("스킵")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disSkip)
).addComponents(
  new ButtonBuilder()
    .setCustomId("quiz-stop")
    .setLabel("퀴즈종료")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disSkip)
);