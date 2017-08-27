# coding: utf-8
import config
import chatterbot
from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer

chatbot = ChatBot(
    'training',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    database_uri = config.db_uri,
    database = config.db_name,
    )

chatbot.set_trainer(ChatterBotCorpusTrainer)
chatbot.train("../training")
