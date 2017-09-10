

from linebot import LineBotApi, WebhookHandler
from linebot.models import TextMessage, MessageEvent, TextSendMessage
import config

from flask import request, abort
from lib.botClass import botClass
import lib.responseLogic as responseLogic
import linebot.exceptions
import time as T

import logging
import logging.config


line_bot_api1 = LineBotApi(config.channel_access_token1)
handler1 = WebhookHandler(config.channel_secret1)

line_bot_api2 = LineBotApi(config.channel_access_token2)
handler2 = WebhookHandler(config.channel_secret2)


def loggingLine(string):
    logging.config.fileConfig('lib/logconfig.ini')
    line = logging.getLogger("line")
    line.info(string)


@handler1.add(MessageEvent, message=TextMessage)
def handle_message1(event):
    # loggingLine("--------------LineBot 1--------------")
    getHandleMessage(line_bot_api1, event)


@handler2.add(MessageEvent, message=TextMessage)
def handle_message2(event):
    # loggingLine("--------------LineBot 2--------------")
    getHandleMessage(line_bot_api2, event)


def getLineReqCallback(app, handler):
    # get X-Line-Signature header value
    signature = request.headers['X-Line-Signature']
    # get request body as text
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)
    try:
        handler.handle(body, signature)
    except linebot.exceptions.InvalidSignatureError:
        abort(400)


def getUserSession(line_bot_api, event):
    try:
        profile = line_bot_api.get_profile(event.source.user_id)
        userName = profile.display_name
    except:
        userName = ''
    userString = userName + ': ' + event.message.text
    return userString


def getHandleMessage(line_bot_api, event):
    # 抓出使用者名字、ID跟訊息
    timeTemp = T.time()
    userString = getUserSession(line_bot_api, event)

    # 丟入使用者輸入的資料得到response
    res = responseLogic.Response(event.message.text)
    directBack, response = res.get()

    # 設定回傳的訊息
    lineclass = botClass(directBack, response, event.message.text, "line", 0)
    send = lineclass.get_format()
    try:
        if hasattr(send[0], 'text') and len(send[0].text) >= 1500:
            length = len(send[0].text)
            count = int(length/1500)+1
            for i in range(count):
                substring = send[0].text[i*1500: (i+1)*1500]
                line_bot_api.push_message(event.source.user_id, TextSendMessage(text=substring))
        else:
            line_bot_api.reply_message(event.reply_token, send)
            # 找不到任何答案時 response是空的array
            loggingLine(userString + '\n' + response[0]["ans"] + '\n')
    except linebot.exceptions.LineBotApiError as e:
        logging.error(e)
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text='啊哦！關於這個問題或許我們遇到了點麻煩。'))

    loggingLine("一次處理時間: " + str(T.time() - timeTemp))
