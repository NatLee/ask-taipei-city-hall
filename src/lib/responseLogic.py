import json
import numpy
import time
from difflib import SequenceMatcher


class Response():
    def __init__(self, input_message):
        self.input = input_message

    def loadData(self):
        with open('../trainingData/data.json', 'r', encoding='UTF-8') as data_file:
            return json.load(data_file)

    def get(self):
        matchList, compareList = self.getList()
        directBack = True  # 直接回傳
        if matchList[0]["con"] > 0.55:
            result = matchList
        elif matchList[0]["con"] > 0.3:
            result = matchList
            directBack = False
        else:
            if len(compareList) > 0:
                result = compareList
            else:
                result = matchList
            directBack = False

        return directBack, result

    def getList(self):
        data = self.loadData()
        matchAry = [
            {
                "qu_new": "",
                "qu_old": "",
                "ans": "",
                "con": 0
            }
        ]
        compareAry = [
            {
                "qu_new": "",
                "qu_old": "",
                "ans": "",
                "con": 0
            }
        ]

        for objData in data:
            q = objData["qu_new"]
            con = SequenceMatcher(None, q, self.input).ratio()
            for i in range(len(matchAry)):
                obj = matchAry[i]
                if(con > obj["con"]):
                    newObj = {
                        "qu_new": objData["qu_new"],
                        "qu_old": objData["qu_old"],
                        "con": con,
                        "ans": objData["ans"]
                    }
                    matchAry.insert(i, newObj)
                    if(len(matchAry) > 4):
                        matchAry.pop()
                    break

            compareCon = self.compare(objData["qu_new"])
            if(compareCon == 1):
                obj = {
                    "qu_new": objData["qu_new"],
                    "qu_old": objData["qu_old"],
                    "compare_con": compareCon,
                    "ans": objData["ans"]
                }
                compareAry.insert(0, obj)
                if(len(compareAry) > 4):
                    compareAry.pop()

        return matchAry, compareAry

    def compare(self, statement):
        temp = numpy.zeros(len(self.input))
        tokens = statement.split(' ')
        for token in tokens:
            find_index = self.input.find(token)
            if find_index >= 0:
                for i in range(len(token)):
                    temp[find_index + i] += 1
        count = 0
        for i in range(len(self.input)):
            if temp[i] != 0:
                count += 1

        leng = len(self.input)
        if(leng == 0):
            confidence = 0
        else:
            confidence = count / leng
        return confidence
