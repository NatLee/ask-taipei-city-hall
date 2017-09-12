# coding: utf-8
from flask import Flask
import lib.fbBotBuild as fb
import lib.lineBotBuild as line

app = Flask(__name__)


@app.route('/')
def index():
    return "<p>Hello YEE!</p>"


@app.route("/callbackFB", methods=['GET', 'POST'])
def callback():
    return fb.fbResponse()


@app.route("/callback1", methods=['POST'])
def callback1():
    line.getLineReqCallback(app, line.handler1)
    return 'OK_1'


@app.route("/callback2", methods=['POST'])
def callback2():
    line.getLineReqCallback(app, line.handler2)
    return 'OK_2'


if __name__ == "__main__":
    app.run(host='0.0.0.0', threaded=True)
