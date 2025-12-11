import assert from "assert";
import { transcode } from "buffer";
import { Client, GatewayIntentBits, Events, ChannelType } from "discord.js";
import { readFileSync, writeFileSync } from "fs";

type Transaction = {
  payer: string;
  participants: string[];
  amount: number;
};

function isTransaction(data: any): data is Transaction {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.payer === "string" &&
    Array.isArray(data.participants) &&
    data.participants.every((p: any) => typeof p === "string") &&
    typeof data.amount === "number" &&
    !Number.isNaN(data.amount)
  );
}

function isTransactionArray(data: any): data is Transaction[] {
  return Array.isArray(data) && data.every((item) => isTransaction(item));
}

//////

const client = new Client({
  intents: [
    // discord botが使う情報をここに書く　権限以上のことを書くとエラーになる
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// チャンネルIDはdiscordのチャンネルの部分を右クリックすると入手できる
// ギルドというのがサーバー
const CHANNEL_GENERAL = "1446799876917694598";
const STORAGE_PATH = "storage.json";
const GUILD_ID = process.env.GUILD_ID;


async function sendMessage(channelId: string, message: string) {
  const channel = await client.channels.fetch(channelId);
  // 型チェック
  if (channel == undefined || channel.type !== ChannelType.GuildText) {
    console.log(
      "channel作れませんでしたもしくはテキストチャンネルではありませんでした"
    );
  } else {
    // これでメッセージを送れる
    await channel.send(message);
  }
}

// addEventListenerみたいなやつ
// client.onceは条件に当てはまったら一度だけ実行される
client.once(Events.ClientReady, (c) => {
  console.log(`準備完了！ ${c.user.tag} としてログインしました。`);
  // ログイン時に1度だけメッセージを送れる
  sendMessage(CHANNEL_GENERAL, "yeah!");
});

// client.onは条件に当てはまるたびに実行される
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.content === "Pong!") {
    await message.reply("Pong!");
  }
});

// コマンドの処理
client.on(Events.InteractionCreate, async (interaction) => {
  // チャットコマンド以外（ボタンなど）は無視
  if (!interaction.isChatInputCommand()) return;

  // コマンド名で分岐
  if (interaction.commandName === "insert") {
    // 今までの履歴を持ってくる
    const transactions = JSON.parse(readFileSync(STORAGE_PATH, "utf8"));
    assert(isTransactionArray(transactions));

    // 受け取った引数はこんな感じで取り出せる
    const participant = interaction.options.getUser("participant", true).id;
    const payer = interaction.options.getUser("payer", true).id;
    const amount = interaction.options.getInteger("amount", true);

    // 新データ作成
    const newData: Transaction = {
      participants: [participant],
      payer,
      amount,
    };
    transactions.push(newData);

    assert(GUILD_ID !== undefined);
    const guild = await client.guilds.fetch(GUILD_ID);

    // 応答文章作成
    let replyText = "";
    for (const {index: i, transaction} of transactions.map((v, i) => {return {index: i, transaction: v}})) {
      console.log(transaction);
      replyText += `${i}: ${
        (await guild.members.fetch(transaction.payer)).displayName
      }が${
        (await guild.members.fetch(transaction.participants[0])).displayName
      }の分のお金を${transaction.amount}円払った\n`;
    }
    await interaction.reply(replyText);
    // Storage.jsonに新データを追加したものを書き込む
    writeFileSync(STORAGE_PATH, JSON.stringify(transactions, undefined, 2));

  } else if (interaction.commandName === "delete") {
    // 1. 今までの履歴を持ってくる
    const transactions = JSON.parse(readFileSync(STORAGE_PATH, "utf8"));
    
    // 型アサーション関数（既存のコードにある想定）
    assert(isTransactionArray(transactions)); 

    // 2. Integer(整数)としてインデックスを受け取る
    const index = interaction.options.getInteger("id", true);

    // 3. バリデーション: その番号のデータが本当に存在するか確認
    if (index < 0 || index >= transactions.length) {
      await interaction.reply({ content: `ID: ${index} のデータは見つかりませんでした。（0 〜 ${transactions.length - 1} の範囲で指定してください）`, ephemeral: true });
      return;
    }

    // 4. 削除実行
    // spliceは削除された要素を配列で返すので、何が消えたか取得しておくと親切です
    const deletedItem = transactions.splice(index, 1)[0];

    // 5. 重要: 変更内容をファイルに書き込む（保存）
    writeFileSync(STORAGE_PATH, JSON.stringify(transactions, null, 2));

    // 6. 完了メッセージ
    await interaction.reply({ content: `ID: ${index} のデータを削除しました。` });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
