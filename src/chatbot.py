from chatterbot import ChatBot
import config

chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    logic_adapters=[{'import_path': 'myLogicAdapter.MyLogicAdapter'}],
    database_uri=config.db_uri,
    database=config.db_name,
    read_only=True
)
