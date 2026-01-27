import { Client, GatewayIntentBits, Events, ChannelType, Channel } from "discord.js";
import { 
  insertDiscordCmd, 
  deleteDiscordCmd, 
  historyDiscordCmd, 
  listDiscordCmd, 
  myListDiscordCmd, 
  refundDiscordCmd, 
  helpDiscordCmd, 
  buttonDiscordCmd, 
  insertDiscordInteractiveCmd, 
  historyDiscordInteractiveCmd, 
  myListDiscordInteractiveCmd, 
  refundDiscordInteractiveCmd,
  getHelp,
  buttonReplyOptions, 
} from "./command-discord";
import { getGlobalButtonNameBody, isButtonName, isCommandName, isInnerButtonName } from "./logic";

//////

const client: Client<boolean> = new Client({
  intents: [
    // discord botが使う情報をここに書く　権限以上のことを書くとエラーになる
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

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
});

client.on(Events.GuildCreate, async (guild) => {
  if (guild.members.me?.permissions.has("ManageChannels")) {
    const channel = await guild.channels.create({ name: "pay-crew-bot", type: 0 });
    await channel.send(`# pay-crew-botを導入していただきありがとうございます！
個人間の貸し借りの登録・削除・返金をサポートします。
本プロダクトは「筑波大学enPiT2025」の中で制作されたものです。
本プロダクトの利用により生じたユーザー間のトラブルについて、開発メンバーは一切の責任を負いません。
# botをいつ使うのか？
このdiscordサーバーのメンバーで食事に行った時、遊びに行った時、もし誰かがまとめて支払ったなら、それはこのBotを使うタイミングです。
その支払いを追加しておき、次に会うときまで返金を持ち越したり、他の支払いと相殺したりすることができます。
# botをどう使うのか？
スラッシュコマンドまたはボタンにて使用することができます。
それぞれ、このチャンネル以外でも使用することができます。このチャンネルは削除していただいても構いません。
スラッシュコマンドの使い方は以下のとおりです。
================================================================================
${getHelp(null)}
================================================================================
スラッシュコマンドが苦手は人は、ボタンで操作することができます。ボタンを押すと、対話形式で必要項目を入力できます。
`)
    await channel.send(buttonReplyOptions());
  }
  console.info(`新たなサーバーに追加されました。
\tguildId: ${guild.id}
`);
})

// コマンドとボタンの処理
client.on(Events.InteractionCreate, async (interaction) => {
  // コマンドの場合
  if (interaction.isChatInputCommand()) {
    // コマンド名を取得
    const commandName = interaction.commandName;
    // 定義されているコマンドが確認(logic.tsで定義)
    if (!isCommandName(commandName)) {
      console.warn(`Warning: Unknown command "${commandName}"
`);
      return;
    };
    // コマンド名で場合分け
    switch (commandName) {
      case "insert":
        await insertDiscordCmd(client, interaction);
        break;
      case "delete":
        await deleteDiscordCmd(client, interaction);
        break;
      case "history":
        await historyDiscordCmd(client, interaction);
        break;
      case "list":
        await listDiscordCmd(client, interaction);
        break;
      case "myList":
        await myListDiscordCmd(client, interaction);
        break;
      case "refund":
        await refundDiscordCmd(client, interaction);
        break;
      case "help":
        await helpDiscordCmd(client, interaction);
        break;
      case "button":
        await buttonDiscordCmd(client, interaction);
        break;
      default:
        console.warn(`Warning: Unknown command "${commandName}", but this is command name.
`);
        break
    }
  // ボタンの場合
  } else if (interaction.isButton()) {
    // ボタンに設定したボタン名(customId)を取得
    const buttonName = interaction.customId;
    // 定義されたボタン名か確認
    if (!isButtonName(buttonName)) {
      console.warn(`Warning: Unknown button "${buttonName}"
`);
      return;
    };
    // 各コマンド内で使われるボタンの場合
    if (isInnerButtonName(buttonName)) {
      console.info(`Info: "${buttonName}" button is selected.
`);
      return;
    }
    // ボタン名の本体を取得
    const buttonNameBody = getGlobalButtonNameBody(buttonName);
    // ボタン名の本体で場合分け
    switch (buttonNameBody) {
      case "insert":
        await insertDiscordInteractiveCmd(client, interaction);
        break; 
      case "history":
        await historyDiscordInteractiveCmd(client, interaction);
        break; 
      case "myList":
        await myListDiscordInteractiveCmd(client, interaction);
        break; 
      case "refund":
        await refundDiscordInteractiveCmd(client, interaction);
        break; 
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
