# coding: utf-8

from flask import Flask, request, abort
from linebot import (LineBotApi, WebhookHandler)
from linebot.models import *
import linebot.exceptions

from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer

import config
import sys

sys.stderr = open('server.log', 'a')
# https://line-chat-test.appspot.com/callback

chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    logic_adapters=[{'import_path': 'myLogicAdapter.MyLogicAdapter'}],
    database_uri=config.db_uri,
    database=config.db_name,
    read_only=True
)

app = Flask(__name__)

line_bot_api = LineBotApi(config.channel_access_token)
handler = WebhookHandler(config.channel_secret)


@app.route('/')
def index():
    return "<p>Hello YEE!</p>"


@app.route("/callback", methods=['POST'])
def callback():
    # get X-Line-Signature header value
    signature = request.headers['X-Line-Signature']
    # get request body as text
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)
    # handle webhook body
    try:
        handler.handle(body, signature)
    except linebot.exceptions.InvalidSignatureError:
        abort(400)
    return 'OK'


@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    actions = []

    # 抓出使用者名字、ID跟訊息
    try:
        profile = line_bot_api.get_profile(event.source.user_id)
        userName = profile.display_name
    except:
        userName = ''
    userString = userName + ': ' + event.message.text
    print(userString)

    # 丟入使用者輸入的資料得到response並使用底線切割
    '''
    資料格式：
    response.text = str(response.confidence) + '_' + closest_match.text + '_' + response.text
    if response.confidence<0.3:
        response.text += '_' + self.all_statement_list
    '''
    response = str(chatbot.get_response(event.message.text)).split('_')

    # 透過分割後的response得到list中第0個元素即為confidence
    confidence = float(response[0])

    # 判斷confidence，若其小於0.3則代表現在的response存在問題集合
    # 若其大於等於0.3則代表response可直接處理
    if confidence < 0.3:
        # 將response中list以\n進行分割得到型態為list的response_list（先不處理空白）
        response_list = response[3].split('\n')
        # pop掉最後一個空元素
        response_list.pop()

        #計算list大小
        length = len(response_list)
        #判斷list大小，若大於1則進入填入選單判斷式
        #因空的list也算有1個元素
        if length > 1:
            #如果list長度超過3，則取前三個
            if length >3:
                length = 3
            #只要有相關問題則append 最多3個到選單上
            for i in range(length):
                actions.append(MessageTemplateAction(
                    # 將空白取代後取前20個字填入（在此才將空白取代因最多也只有三項）
                    label=str(response_list[i].replace(' ','')[0:19]),
                    text=str(response_list[i].replace(' ','')[0:19]),
                    )
                )

            print('選單的選項數: ' + str(len(actions)))

            # 先將最可能的回應push送出給使用者
            print('Bot: （最相關的回應）' + response[2])

            line_bot_api.push_message(event.source.user_id,TextSendMessage(text=response[2]))
            line_bot_api.push_message(event.source.user_id,TextSendMessage(text='或許您可以嘗試\n' + 'https://www.google.com.tw/search?q=' + event.message.text))
            # 填入選單
            buttons_template_message = TemplateSendMessage(
                alt_text = '問題選單',
                template = ButtonsTemplate(
                    title = '發現其他問題',
                    text = '或許下面可能有您想問的問題',
                    actions = actions,
                )
            )
            send = buttons_template_message
            print('Bot: （因項目過多，送出選單）')

        else:
            # 下面是處理資料庫中找不到相關選項時的回應
            print('資料庫中找不到任何相關的選項')
            print('Bot: ' + response[2])
            # 傳送最有可能的回應
            line_bot_api.push_message(event.source.user_id,TextSendMessage(text=response[2]))
            line_bot_api.push_message(event.source.user_id,TextSendMessage(text='以上回答可能無法滿足您的需求'))
            send = TextSendMessage(text='或許您可以嘗試\n' + 'https://www.google.com.tw/search?q=' + event.message.text)
    else:
        print('Bot: ' + response[2])
        send = TextSendMessage(text = response[2])

    userDataLog = open("userdata.log", mode = 'a', encoding = 'utf-8')
    userDataLog.write(userString + '\n' + response[2] + '\n' + "confidence = " + str(confidence) + "\n")
    userDataLog.close()

    try:
        line_bot_api.reply_message(event.reply_token,send)
    except linebot.exceptions.LineBotApiError as e:
        print(e.status_code)
        print(e.error.message)
        print(e.error.details)
        line_bot_api.reply_message(event.reply_token,TextSendMessage(text='啊哦！關於這個問題或許我們遇到了點麻煩。'))


if __name__ == "__main__":
    app.run(host='0.0.0.0')
