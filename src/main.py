# coding: utf-8

from flask import Flask, request, abort
from linebot import (LineBotApi, WebhookHandler)
from linebot.models import *
import linebot.exceptions

from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer

import config

#https://line-chat-test.appspot.com/callback

chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    logic_adapters=[{'import_path' : 'myLogicAdapter.MyLogicAdapter'}],
    database_uri = config.db_uri,
    database = config.db_name,
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
    except InvalidSignatureError:
        abort(400)
    return 'OK'


@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    actions=[]
    '''
    MessageTemplateAction(
                        label='message1',
                        text='message text1'
                    )
    '''

    print('使用者: ' + event.message.text)

    response = str(chatbot.get_response(event.message.text)).replace(' ','')
    confidence = float(response.split('_')[0])
    response = response.split('_')[1]
    if confidence < 0.3:
        response_list = response.split('\n')
        response_list.pop()

        if len(response_list) > 3:
            length = 3
        else:
            length = len(response_list)

        for i in range(length):
            actions.append(MessageTemplateAction(
                #label=str(response_list[i].replace(' ','')[1:20]),
                #text=str(response_list[i].replace(' ','')[1:20]),
                label = str(response_list[i][1:20]),
                text = str(response_list[i][1:20]),
                )
            )
        print(len(actions))

        buttons_template_message = TemplateSendMessage(
            alt_text = '問題選單',
            template = ButtonsTemplate(
                title = '您可能想問的問題',
                text = '請選擇',
                actions = actions,
            )
        )
        send = buttons_template_message
    else:
        send = TextSendMessage(text = response)


    #print('BOT: ' + string)
    print(response)
    #line_bot_api.reply_message(event.reply_token,TextSendMessage(text=response)
    try:
        line_bot_api.reply_message(event.reply_token,send)
    except linebot.exceptions.LineBotApiError as e:
        print(e.status_code)
        print(e.error.message)
        print(e.error.details)
        line_bot_api.reply_message(event.reply_token,TextSendMessage(text='回應字數超過上限，請待資料庫更新。'))

    '''
    with open('statement_list.txt',encoding='utf-8',mode='r') as file:
        for line in file:
            print(line)
    '''

if __name__ == "__main__":
    app.run(host='0.0.0.0')
