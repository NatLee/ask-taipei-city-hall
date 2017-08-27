# coding: utf-8

import chatterbot
from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer

chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    logic_adapters=[
        'chatterbot.logic.BestMatch'
    ],
    filters=[
        'chatterbot.filters.RepetitiveResponseFilter'
    ],
    database_uri="mongodb://140.118.155.181:27017/",
    database='chatterbot-database2',
    read_only=True,
    )

options = [
    (0.50, 'Hello'),
    (0.85, 'Hola'),
    (0.42, 'Haha')
]
print(chatbot.logic.get_greatest_confidence(statement='Hola',options=options))

chatterbot.comparisons.LevenshteinDistance.compare( ('yee',1) , 'yee' , 'yyy' )

#chatbot.set_trainer(ChatterBotCorpusTrainer)
#chatbot.train("./textData/TaipeiQA.yml")

'''
print('可以開始輸入了...')

while True:
    try:
        print(chatbot.get_response(input()))

    # Press ctrl-c or ctrl-d on the keyboard to exit
    except (KeyboardInterrupt, EOFError, SystemExit):
        break
'''
