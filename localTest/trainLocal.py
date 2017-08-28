# coding: utf-8
import sys
from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer

sys.stderr = open('./error.log', 'w')
chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    database_uri="mongodb://140.118.155.181:27017/",
    database='chatterbot-database2'
    )
chatbot.set_trainer(ChatterBotCorpusTrainer)
chatbot.train("chatterbot.corpus.tchinese")
# chatbot.train("../textData/output.yml")
