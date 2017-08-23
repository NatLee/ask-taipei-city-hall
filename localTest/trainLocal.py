# coding: utf-8
import sys
from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
sys.stderr = open('./error.log', 'w')
chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    logic_adapters=[
        'chatterbot.logic.BestMatch'
    ],
    # filters=[
    #     'chatterbot.filters.RepetitiveResponseFilter'
    # ],
    database_uri="mongodb://localhost:27017/",
    database='chatterbot-database',
    # read_only = True
    )
chatbot.set_trainer(ChatterBotCorpusTrainer)
chatbot.train("./textData/output.yml")

print('可以開始輸入了...')

while True:
    try:
        print(chatbot.get_response(input()))

    # Press ctrl-c or ctrl-d on the keyboard to exit
    except (KeyboardInterrupt, EOFError, SystemExit):
        break
