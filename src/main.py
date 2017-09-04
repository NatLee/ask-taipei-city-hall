# coding: utf-8
from flask import Flask
from lineBotBuild import (handler1, handler2)
import fbBotBulid as fb
import getLine
import sys
sys.stderr = open('server.log', 'a')
app = Flask(__name__)


@app.route('/')
def index():
    return "<p>Hello YEE!</p>"


@app.route("/callbackFB", methods=['GET', 'POST'])
def callback():
    return fb.fbResponse()


@app.route("/callback1", methods=['POST'])
def callback1():
    getLine.getCallback(app, handler1)
    return 'OK_1'


@app.route("/callback2", methods=['POST'])
def callback2():
    getLine.getCallback(app, handler2)
    return 'OK_2'


if __name__ == "__main__":
    app.run(host='0.0.0.0', threaded=True)
