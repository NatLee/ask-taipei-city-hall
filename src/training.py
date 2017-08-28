# coding: utf-8
import config
import chatterbot
from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer

chatbot = ChatBot(
    'training',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    database_uri = "mongodb://localhost:27017",
    database = config.db_name,
    )

chatbot.set_trainer(ChatterBotCorpusTrainer)
chatbot.train("../trainingData")
