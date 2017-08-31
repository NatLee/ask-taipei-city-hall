# coding: utf-8
from flask import Flask, request, abort
from linebot import (LineBotApi, WebhookHandler)
from linebot.models import (
    MessageTemplateAction,
    TemplateSendMessage,
    ButtonsTemplate,
    TextSendMessage,
    MessageEvent,
    TextMessage,
    ImageSendMessage
)
import linebot.exceptions

from chatterbot import ChatBot

import config
import sys
import datetime

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


def get_linebot_menu(response_list):
    actions = []
    length = len(response_list)
    # 如果list長度超過3，則取前三個
    if length > 3:
        length = 3
    # 只要有相關問題則append 最多3個到選單上
    for i in range(length):
        actions.append(MessageTemplateAction(
            # 將空白取代後取前20個字填入（在此才將空白取代因最多也只有三項）
            label=str(response_list[i].replace(' ', '')[0:19]),
            text=str(response_list[i].replace(' ', '')[0:19]),
        ))

    print('選單的選項數: ' + str(len(actions)))

    # 先將最可能的回應push送出給使用者
    buttons_template_message = TemplateSendMessage(
        alt_text='問題選單',
        template=ButtonsTemplate(
            thumbnail_image_url='https://raw.githubusercontent.com/NatLee/test/master/PASSION.jpg',
            title='發現其他問題',
            text='或許下面可能有您想問的問題',
            actions=actions,
        )
    )
    return buttons_template_message


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
    totalTime = datetime.datetime.now()

    time1 = datetime.datetime.now()
    # 抓出使用者名字、ID跟訊息
    try:
        profile = line_bot_api.get_profile(event.source.user_id)
        userName = profile.display_name
    except:
        userName = ''
    userString = userName + ': ' + event.message.text
    print(userString)
    print("讀取使用者資料花費時間：" + str(datetime.datetime.now() - time1))

    '''
    資料格式：
    response.text = str(response.confidence) + '_' + closest_match.text + '_' + response.text
    if response.confidence<0.3:
        response.text += '_' + self.all_statement_list
    '''

    time1 = datetime.datetime.now()
    # 丟入使用者輸入的資料得到response並使用底線切割
    response = str(chatbot.get_response(event.message.text)).split('_')
    # 透過分割後的response得到list中第0個元素即為confidence
    confidence = float(response[0])
    print("邏輯運作時間：" + str(datetime.datetime.now() - time1))

    time1 = datetime.datetime.now()
    # 先回找到的答案在判斷要補輸出什麼
    send = TextSendMessage(text=response[2])
    print('Bot: ' + response[2])
    try:
        line_bot_api.reply_message(event.reply_token, send)
    except linebot.exceptions.LineBotApiError as e:
        print(e.status_code)
        print(e.error.message)
        print(e.error.details)
        line_bot_api.reply_message(
            event.reply_token, TextSendMessage(text='啊哦！關於這個問題或許我們遇到了點麻煩。'))
    print("回覆使用者花費時間：" + str(datetime.datetime.now() - time1))

    time1 = datetime.datetime.now()

    # 判斷confidence，若其小於0.3則代表現在的response存在問題集合
    # 若其大於等於0.3則代表response可直接處理
    if confidence < 0.3:
        line_bot_api.push_message(
            event.source.user_id, TextSendMessage(text='以上回答可能無法滿足您的需求'))

        # 將response中list以\n進行分割得到型態為list的response_list（先不處理空白）
        response_list = response[3].split('\n')
        # pop掉最後一個空元素
        response_list.pop()
        # 計算list大小
        length = len(response_list)
        # 判斷list大小，若大於1則進入填入選單判斷式
        # 因空的list也算有1個元素
        if length > 1:
            # 填入選單
            line_bot_api.push_message(event.source.user_id, get_linebot_menu(response_list))
            print('Bot: （因項目過多，送出選單）')
        else:
            # 下面是處理資料庫中找不到相關選項時的回應
            print('資料庫中找不到任何相關的選項')
            image_message = ImageSendMessage(
                original_content_url='https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg',
                preview_image_url='https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg'
            )
            line_bot_api.push_message(event.source.user_id, image_message)

        line_bot_api.push_message(event.source.user_id, TextSendMessage(
            text='或許您可以嘗試\n' +
            'https://www.google.com.tw/search?q=' + event.message.text)
        )

    userDataLog = open("userdata.log", mode='a', encoding='utf-8')
    userDataLog.write(
        userString + '\n' + response[2] + '\n' + "confidence = " + str(confidence) + "\n")
    userDataLog.close()
    print("處理資料回答花費時間：" + str(datetime.datetime.now() - time1))
    print("整體運作時間：" + str(datetime.datetime.now() - totalTime))


if __name__ == "__main__":
    app.run(host='0.0.0.0')
