import { client } from "./";
import { guild_type } from "./database/obj/guild";

export function QUIZ_RULE(guildDB: guild_type): string {
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