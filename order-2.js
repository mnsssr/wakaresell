// Принимает заказ с сайта и отправляет его вам в Telegram.
// BOT_TOKEN и CHAT_ID берутся из переменных окружения Netlify, в код их вписывать не нужно.
const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const cut = (v, n) => String(v ?? "").slice(0, n);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };

  let d;
  try {
    d = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Bad request" };
  }

  if (d.website) return { statusCode: 200, body: "ok" }; // скрытое поле для ботов
  if (!d.name || !d.contact || !d.item)
    return { statusCode: 400, body: "Missing fields" };

  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (!BOT_TOKEN)
    return {
      statusCode: 500,
      body: "Переменная BOT_TOKEN не найдена. Проверьте название и запустите новый деплой.",
    };
  if (!CHAT_ID)
    return {
      statusCode: 500,
      body: "Переменная CHAT_ID не найдена. Проверьте название и запустите новый деплой.",
    };

  const it = d.item;
  const text = [
    "🛍 <b>Новый заказ</b>",
    "",
    `<b>Вещь:</b> ${esc(cut(it.title || it.name, 120))}`,
    `<b>Детали:</b> ${esc(cut(it.sub, 60)) || "не указаны"}`,
    `<b>Цена:</b> ${esc(cut(it.price, 20))}`,
    "",
    `<b>Покупатель:</b> ${esc(cut(d.name, 60))}`,
    `<b>Контакт:</b> ${esc(cut(d.contact, 80))}`,
    `<b>Адрес:</b> ${esc(cut(d.addr, 200)) || "не указан"}`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN.trim()}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID.trim(),
          text,
          parse_mode: "HTML",
        }),
      },
    );
    if (res.ok) return { statusCode: 200, body: "ok" };
    const info = await res.json().catch(() => ({}));
    return {
      statusCode: 502,
      body: "Telegram ответил: " + (info.description || res.status),
    };
  } catch (e) {
    return {
      statusCode: 502,
      body: "Не удалось связаться с Telegram: " + e.message,
    };
  }
};
