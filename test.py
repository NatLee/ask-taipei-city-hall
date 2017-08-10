# coding: utf-8

from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
chatbot = ChatBot(
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 60758e91c2c96a7447b41ee7a683c08b31c9caaf
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
<<<<<<< HEAD
=======
=======
    "test",
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    database_uri="mongodb://localhost:27017/"
    # database = "./chatbot"
>>>>>>> 7275ecff992696b62ad92904bf1548623a505b2d
>>>>>>> 60758e91c2c96a7447b41ee7a683c08b31c9caaf
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
