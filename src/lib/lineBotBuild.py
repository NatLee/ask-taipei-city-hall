

from linebot import LineBotApi, WebhookHandler
from linebot.models import TextMessage, MessageEvent
import lib.getLine as getLine
import config

line_bot_api1 = LineBotApi(config.channel_access_token1)
handler1 = WebhookHandler(config.channel_secret1)

line_bot_api2 = LineBotApi(config.channel_access_token2)
handler2 = WebhookHandler(config.channel_secret2)


@handler1.add(MessageEvent, message=TextMessage)
def handle_message1(event):
    print("--------------LineBot 1--------------")
    getLine.getHandleMessage(line_bot_api1, event)


@handler2.add(MessageEvent, message=TextMessage)
def handle_message2(event):
    print("--------------LineBot 2--------------")
    getLine.getHandleMessage(line_bot_api2, event)
