# coding: utf-8

from chatterbot import ChatBot
from chatterbot.trainers import ListTrainer
import socket, time, os

HOST = "irc.twitch.tv"
PORT = 6667
NICK = "Cfairy"
PASS = 'oauth:***REMOVED***'
CHANNEL = 'naliqq'
rw=['1','1','1','10','10','10','87']

deepThought = ChatBot("Training demo")
deepThought.set_trainer(ListTrainer)

msglog=[]

def send_message(message):
    s.send(bytes("PRIVMSG #" + CHANNEL + " :" + message + "\r\n", "UTF-8"))
    print('Clone' + NICK + ': ' + message)

s = socket.socket()
s.connect((HOST, PORT))
s.send(bytes("PASS " + PASS + "\r\n", "UTF-8"))
s.send(bytes("NICK " + NICK + "\r\n", "UTF-8"))
s.send(bytes("JOIN #" + CHANNEL + " \r\n", "UTF-8"))

start_time=time.time()


while True:
    line = str(s.recv(1024))
    if "End of /NAMES list" in line:
        break


#send_message('由我先攻，抽牌！')


while True:
    sRecv=s.recv(1024)
    data = sRecv.rstrip()
    # rawData Sample:
    # :usr!usr@usr.tmi.twitch.tv PRIVMSG #channel :string
    try:
        rawData = data.decode("UTF-8")
        parts = rawData.split(':')
    except Exception as e:
        print(e)
        continue


    if 'PING :tmi.twitch.tv' in rawData:
        #print(rawData)
        s.send(bytes("PONG :tmi.twitch.tv\r\n", "UTF-8"))
        #print('PONG :tmi.twitch.tv')
        continue
    #ping-pong

    if len(parts) < 3:
        print(rawData)
        continue

    message = rawData.split(':')[2].strip()
    username = rawData.split(':')[1].split('!')[0]

    if message.find('!說')>=0:
      send_message('不！我不要說!')
      continue


    if message.find('!占卜 ')==0:
      import random
      p=random.randint(0,100)
      send_message('%s%%'%p)
      continue

    if message.find('!閉嘴 Cfairy')==0:
      time.sleep(60)
      continue

    print(username + ": " + message)
    #print(rawData)

    if username is not 'nightbot':
        #time.sleep(2)

        if CHANNEL not in message and NICK not in message:
            #print('Cfairy : '+str(deepThought.get_response(message)))
            send_message(str(deepThought.get_response(message)))
            msglog.append(message)

            if len(msglog)>2:
                #deepThought.train(msglog)
                msglog=[]
        continue


#commands
# os.system("pause")
