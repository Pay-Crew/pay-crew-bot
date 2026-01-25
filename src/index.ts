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
} from "./command-discord";
import { getGlobalButtonNameBody, isButtonName, isCommandName, isInnerButtonName } from "./logic";

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

// コマンドとボタンの処理
client.on(Events.InteractionCreate, async (interaction) => {
  // コマンドの場合
  if (interaction.isChatInputCommand()) {
    // コマンド名を取得
    const commandName = interaction.commandName;
    // 定義されているコマンドが確認(logic.tsで定義)
    if (!isCommandName(commandName)) {
      console.log(`Warning: Unknown command "${commandName}"
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
        console.log(`Warning: Unknown command "${commandName}", but this is command name.
`);
        break
    }
  // ボタンの場合
  } else if (interaction.isButton()) {
    // ボタンに設定したボタン名(customId)を取得
    const buttonName = interaction.customId;
    // 定義されたボタン名か確認
    if (!isButtonName(buttonName)) {
      console.log(`Warning: Unknown button "${buttonName}"
`);
      return;
    };
    // 各コマンド内で使われるボタンの場合
    if (isInnerButtonName(buttonName)) {
      console.log(`Info: "${buttonName}" button is selected.
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
