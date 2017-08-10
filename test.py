# coding: utf-8

from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
chatbot = ChatBot(
<<<<<<< HEAD
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    logic_adapters=[
        'chatterbot.logic.BestMatch'
    ],
    filters=[
        'chatterbot.filters.RepetitiveResponseFilter'
    ],
    database_uri="mongodb://localhost:27017/",
    database='chatterbot-database'
=======
    "test",
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    database_uri="mongodb://localhost:27017/"
    # database = "./chatbot"
>>>>>>> 7275ecff992696b62ad92904bf1548623a505b2d
    )

#chatbot.set_trainer(ChatterBotCorpusTrainer)

#chatbot.train("./textData")

print('可以開始輸入了...')

while True:
    try:
        print(chatbot.get_response(input()))
        
    # Press ctrl-c or ctrl-d on the keyboard to exit
    except (KeyboardInterrupt, EOFError, SystemExit):
        break
