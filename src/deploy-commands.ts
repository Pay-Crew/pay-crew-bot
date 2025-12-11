import { REST, Routes, SlashCommandBuilder } from 'discord.js';


// 登録するコマンドリスト
const commands = [
  // 追加
  new SlashCommandBuilder()
    .setName('insert') // コマンド名 すべて小文字
    .setDescription('支払いを追加します')
    .addUserOption((option) => 
      option
        .setName('payer')
        .setDescription('支払った人')
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('participant')
        .setDescription('相手')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('金額')
        .setRequired(true)
    ),
  // 削除
  new SlashCommandBuilder()
      .setName('delete') // コマンド名
      .setDescription('指定したIDのデータを削除します')
      .addIntegerOption((option) => 
        option.setName('id')
          .setDescription('削除したいデータの番号（ID）')
          .setRequired(true)
      )
].map(command => command.toJSON());

// おまじない　サーバーにコマンドを登録する
const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
    throw new Error('環境変数が不足しています');
}

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        console.log('登録開始');
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        console.log('コマンド登録成功');
    } catch (error) {
        console.error(error);
    }
})();