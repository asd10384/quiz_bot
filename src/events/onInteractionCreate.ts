import { ButtonInteraction, GuildMember, Interaction } from "discord.js";
import { client, handler } from "..";
import { QDB } from "../databases/Quickdb";
import { getUserChannel } from "../quiz/getChannel";

export const onInteractionCreate = async (interaction: Interaction) => {
  if (interaction.isStringSelectMenu()) {
    await interaction.deferReply({ ephemeral: true, fetchReply: true }).catch(() => {});
    const commandName = interaction.customId;
    const args = interaction.values;
    const command = handler.commands.get(commandName);
    if (command && command.menuRun) return command.menuRun(interaction, args);
  }
  
  if (interaction.isButton()) {
    const args = interaction.customId.split("-");
    if (!args || args.length === 0) return;
    if (args[0] === "quiz") {
      let check = await quiz(interaction, args[1]);
      if (check) interaction.deferUpdate({ fetchReply: false }).catch(() => {});
      return;
    }
    await interaction.deferReply({ ephemeral: true, fetchReply: true }).catch(() => {});
    const command = handler.commands.get(args.shift()!);
    if (command && command.buttonRun) return command.buttonRun(interaction, args);
  }

  if (!interaction.isCommand()) return;

  /**
   * 명령어 친사람만 보이게 설정
   * ephemeral: true
   */
  await interaction.deferReply({ ephemeral: true, fetchReply: true });
  handler.runCommand(interaction);
}

async function quiz(interaction: ButtonInteraction, cmd: string): Promise<boolean> {
  const GDB = await QDB.guild.get(interaction.guild!);
  const qc = client.getqc(interaction.guild!);
  
  if (interaction.channelId != GDB.channelId) return true;

  if (qc.playing) {
    if (cmd == "skip") {
      qc.setSkip(interaction, interaction.member!.user.id);
    }
    if (cmd == "hint") {
      qc.setHint(interaction, interaction.member!.user.id);
    }
    if (cmd == "stop") {
      qc.stop();
    }
    return true;
  }
  
  if ((qc.page.userId?.length ?? 0) > 0 && qc.page.userId != interaction.member!.user.id) {
    interaction.reply({ embeds: [
      client.mkembed({
        title: `**퀴즈 오류**`,
        description: `<@${qc.page.userId}>님이 <@${interaction.member!.user.id}>님보다 먼저 사용하셨습니다.`,
        color: "DarkRed"
      })
    ], ephemeral: true });
    return false;
  }

  if (qc.cooldown+client.cooldownTime > Date.now()) {
    interaction.reply({ embeds: [
      client.mkembed({
        title: `**퀴즈 오류**`,
        description: `이모지를 너무 빨리 눌렀습니다.\n${((qc.cooldown+client.cooldownTime-Date.now())/1000).toFixed(2)}초 뒤에 사용해주세요.`,
        color: "DarkRed"
      })
    ], ephemeral: true });
    return false;
  }

  qc.setcooldown(Date.now());
  
  if (cmd == "ready") {
    if (qc.page.userId) {
      interaction.reply({ embeds: [
        client.mkembed({
          title: `**퀴즈 시작 오류**`,
          description: `이미 퀴즈가 시작되었습니다.`,
          color: "DarkRed"
        })
      ], ephemeral: true });
      return false;
    }
    if (!getUserChannel(interaction.member as GuildMember)) {
      interaction.reply({ embeds: [
        client.mkembed({
          title: `\` 음성 오류 \``,
          description: `먼저 음성채널에 들어간뒤 사용해주세요.`,
          color: "DarkRed"
        })
      ], ephemeral: true });
      return false;
    }
    qc.ready(interaction, interaction.member!.user.id);
    return true;
  }

  if (cmd == "left" || cmd == "right") {
    let getnowpage = qc.page.page;
    getnowpage = (cmd == "left") ? getnowpage - 1 : getnowpage + 1;
    if (getnowpage < 0) {
      qc.setpage({ page: 0 });
    } else if (getnowpage > qc.page.maxpage) {
      qc.setpage({ page: qc.page.maxpage });
    } else {
      qc.setpage({ page: getnowpage });
    }
    qc.ready(interaction, interaction.member!.user.id);
    return true;
  }
  
  if (qc.page.check) {
    if (cmd == "easy") {
      qc.setpage({ go: true, mode: "easy" });
      qc.ready(interaction, interaction.member!.user.id);
    }
    if (cmd == "normal") {
      qc.setpage({ go: true, mode: "normal" });
      qc.ready(interaction, interaction.member!.user.id);
    }
    return true;
  }

  if (cmd == "1" || cmd == "2" || cmd == "3" || cmd == "4" || cmd == "5") {
    var number = Number(cmd);
    let pp = qc.page.page;
    if (qc.page.list.length >= (pp*5)+number) {
      qc.setpage({ name: qc.page.list[(pp*5)+number-1], check: true });
    }
    qc.ready(interaction, interaction.member!.user.id);
    return true;
  }

  if (cmd == "back") {
    qc.setpage({ page: 0, name: null, check: false, go: false });
    qc.ready(interaction, interaction.member!.user.id);
    return true;
  }

  if (cmd == "stop") {
    qc.stop();
    return true;
  }
  return false;
}