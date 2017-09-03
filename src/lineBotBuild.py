

from linebot import LineBotApi, WebhookHandler

import config

line_bot_api1 = LineBotApi(config.channel_access_token1)
handler1 = WebhookHandler(config.channel_secret1)

line_bot_api2 = LineBotApi(config.channel_access_token2)
handler2 = WebhookHandler(config.channel_secret2)
