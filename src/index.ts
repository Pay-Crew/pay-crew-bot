import { Client, GatewayIntentBits, Events, ChannelType, Channel } from "discord.js";
import { insertDiscordCmd, deleteDiscordCmd, historyDiscordCmd, listDiscordCmd, myListDiscordCmd, refundDiscordCmd, helpDiscordCmd, insertDiscordInteractiveCmd, testDiscordCmd, buttonDiscordCmd } from "./command-discord";

//////

const client: Client<boolean> = new Client({
  intents: [
    // discord botが使う情報をここに書く　権限以上のことを書くとエラーになる
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

// チャンネルIDはdiscordのチャンネルの部分を右クリックすると入手できる
// ギルドというのがサーバー
// 試験用サーバーの情報
const CHANNEL_ID: string = "1446799876917694598";
// const GUILD_ID: string | undefined = process.env.GUILD_ID;
// assert(GUILD_ID !== undefined);

async function sendMessage(channelId: string, message: string) {
  const channel: Channel | null = await client.channels.fetch(channelId);
  // 型チェック
  if (channel === null) {
    console.log(
      "チャンネルに接続できませんでした"
    );
    return;
  } else if (channel.type !== ChannelType.GuildText) {
    console.log(
      "テキストチャンネルではありませんでした"
    );
    return;
  }
  // これでメッセージを送れる
  await channel.send(message);
}

// addEventListenerみたいなやつ
// client.onceは条件に当てはまったら一度だけ実行される
client.once(Events.ClientReady, async (c) => {
  console.log(`準備完了！ ${c.user.tag} としてログインしました。`);
  // ログイン時に1度だけメッセージを送れる
  // sendMessage(CHANNEL_ID, "yeah!");
  // メンバーを取得
  // if (GUILD_ID !== undefined) {
  //   const guild = await client.guilds.fetch(GUILD_ID);
  //   await guild.members.fetch();
  // }
});

// client.onは条件に当てはまるたびに実行される
// client.on(Events.MessageCreate, async (message) => {
//   if (message.author.bot) return;
//   if (message.content === "Pong!") {
//     await message.reply("Pong!");
//   }
// });

// コマンドの処理
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    // コマンド名で分岐
    if (interaction.commandName === "insert") {
      await insertDiscordCmd(client, interaction);
    } else if (interaction.commandName === "delete") {
      await deleteDiscordCmd(client, interaction);
    } else if (interaction.commandName === "history") {
      await historyDiscordCmd(client, interaction);
    } else if (interaction.commandName === "list") {
      await listDiscordCmd(client, interaction)
    } else if (interaction.commandName === "my-list") {
      await myListDiscordCmd(client, interaction)
    } else if (interaction.commandName === "refund") {
      await refundDiscordCmd(client, interaction)
    } else if (interaction.commandName === "help") {
      await helpDiscordCmd(client, interaction)
    } else if (interaction.commandName === "button") {
      await buttonDiscordCmd(client, interaction)
    } else if (interaction.commandName === "test") {
      await testDiscordCmd(client, interaction)
    } else {
      throw new Error("Unknown command")
    }
  } else if (interaction.isButton()) {
    if (interaction.customId.slice(0, 7) == "__inner") {
      return;
    } else if (interaction.customId === "insert") {
      await insertDiscordInteractiveCmd(client, interaction);
    } else {
      throw new Error("Unknown button")
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
