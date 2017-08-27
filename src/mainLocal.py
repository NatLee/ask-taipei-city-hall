# coding: utf-8

from flask import Flask, request, abort
from linebot import (LineBotApi, WebhookHandler)
from linebot.models import *
import linebot.exceptions

from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer


import config
#import myLogicAdapter


#https://line-chat-test.appspot.com/callback
chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    logic_adapters=[{'import_path' : 'myLogicAdapter.MyLogicAdapter'}],
    #filters=['chatterbot.filters.RepetitiveResponseFilter'],
    #database_uri="mongodb://localhost:27017/",
    database_uri="mongodb://140.118.155.181:27017/",
    database='chatterbot-database2',
    read_only=True
    )

#chatbot.set_trainer(ChatterBotCorpusTrainer)
#chatbot.train("./textData")


app = Flask(__name__)
# nat
# channel_access_token = '***REMOVED***'
# channel_secret = '***REMOVED***'
# hang
channel_access_token = config.channel_access_token
channel_secret = config.channel_secret

line_bot_api = LineBotApi(channel_access_token)
handler = WebhookHandler(channel_secret)

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
    #string=str(chatbot.get_response(event.message.text)

    tokenStatement = 'hangyeeeeeeeeCool'
    tokenConfidence = 'HeyYAYAYA'
    statement = str(chatbot.get_response(event.message.text))
    print(statement)
    print('****************')


    statement_list = statement.split(tokenStatement)[1].split('\n')
    statement_list.pop()

    statement = statement.split(tokenStatement)[0]

    confidence = statement.split(tokenConfidence)[1]

    print('****************')
    print(statement_list)
    #actions.append(MessageTemplateAction(label=all_statement_list_split[0],text=all_statement_list_split[0]))

    if float(confidence)<0.3:
        if len(statement_list)>3:
            length = 3
        else:
            length = len(statement_list)
        for i in range(length):
            actions.append(MessageTemplateAction(
                #label=str(statement_list[i].replace(' ','')[1:20]),
                #text=str(statement_list[i].replace(' ','')[1:20]),
                label=str(statement_list[i][1:20]),
                text=str(statement_list[i][1:20]),
                )
            )
        print(len(actions))

        buttons_template_message = TemplateSendMessage(
            alt_text='問題選單',
            template=ButtonsTemplate(
                title='您可能想問的問題',
                text='請選擇',
                actions=actions,
            )
        )
        send=buttons_template_message
    else:
        send=TextSendMessage(text=statement)


    #print('BOT: ' + string)
    print(statement)
    #line_bot_api.reply_message(event.reply_token,TextSendMessage(text=statement))
    try:
        line_bot_api.reply_message(event.reply_token,send)
    except linebot.exceptions.LineBotApiError as e:
        print(e.status_code)
        print(e.error.message)
        print(e.error.details)

    '''
    with open('statement_list.txt',encoding='utf-8',mode='r') as file:
        for line in file:
            print(line)
    '''

if __name__ == "__main__":
    app.run(host='0.0.0.0')
