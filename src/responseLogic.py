import json
import numpy
import time
from difflib import SequenceMatcher


class Response():
    def __init__(self, input_message):
        self.input = input_message

    def loadData(self):
        with open('data.json', 'r', encoding='UTF-8') as data_file:
            return json.load(data_file)

    def get(self):
        time1 = time.time()
        response = ''
        re = []
        confidence = 0
        all_statement_list = []
        time2 = time.time()
        datas = self.loadData()
        print("讀 JSON 花費時間：" + str(time.time() - time2) + "秒")
        for data in datas:
            con = SequenceMatcher(None, data["qu_new"], self.input).ratio()
            if confidence < 0.3:
                if self.compare(data["qu_new"]) == 1:
                    all_statement_list.append(data["qu_old"])
            if con > confidence:
                confidence = con
                response = data['ans']
        re.append(str(confidence))
        re.append(response)
        re.append(all_statement_list)
        print("總花費時間：" + str(time.time() - time1) + "秒")
        return re

    def compare(self, statement):
        temp = numpy.zeros(len(self.input))
        tokens = statement.split(' ')
        for token in tokens:
            find_index = self.input.find(token)
            if find_index >= 0:
                for i in range(len(token)):
                    temp[find_index+i] += 1
        count = 0
        for i in range(len(self.input)):
            if temp[i] != 0:
                count += 1
        try:
            confidence = (count / len(self.input))
        except:
            confidence = 0
        return confidence
