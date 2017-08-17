from flask import Flask, request, abort
from linebot import (LineBotApi, WebhookHandler)
from linebot.exceptions import (InvalidSignatureError)
from linebot.models import (MessageEvent, TextMessage, TextSendMessage)

from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
import _thread

chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    #logic_adapters=['chatterbot.logic.BestMatch'],
    #filters=['chatterbot.filters.RepetitiveResponseFilter'],
    database_uri="mongodb://localhost:27017/",
    database='chatterbot-database'
    )


app = Flask(__name__)

channel_access_token = '***REMOVED***'
channel_secret = '***REMOVED***'
line_bot_api = LineBotApi(channel_access_token)
handler = WebhookHandler(channel_secret)

@app.route('/')
def index():
    return "<p>Hello World!</p>"


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

def search_string(string):
    return str(chatbot.get_response(string))



@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    print('使用者: ' + event.message.text)
    #string=str(chatbot.get_response(event.message.text)
    try:
        string=search_string(event.message.text)
        print('BOT: ' + string)
        line_bot_api.reply_message(event.reply_token,TextSendMessage(text=string))
    except:
        print('BOT: (不明錯誤，可能是字數太多？)')
        line_bot_api.reply_message(event.reply_token,TextSendMessage(text='回應字數超過上限，請待資料庫更新。'))

if __name__ == "__main__":
    app.run()
