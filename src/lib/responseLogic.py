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
        # 字串比對清單, 符合字串清單
        matchList, compareList = self.getList()
        # 直接回傳
        directBack = True
        # 信心水準處理事件
        if matchList[0]["con"] > 0.55:  # 可以直接回
            result = matchList
        elif matchList[0]["con"] > 0.3:  # 要詢問是否要問是否為matchList這幾項問題
            result = matchList
            directBack = False
        else:  # 要詢問是否要問是否為compareList這幾項問題
            if len(compareList) == 1:
                result = compareList
            elif len(compareList) > 1:
                result = compareList
                directBack = False
            else:
                result = matchList
                directBack = False

        return directBack, result

    def getList(self):
        # 載入所有的問答資料
        data = self.loadData()
        # 產生一個空的資料集
        matchAry = self.getModel()
        # 產生一個空的資料集
        compareAry = []

        for objData in data:
            # 字串比對相似度 並且加到matchAry (高到低)
            self.match_with_list(matchAry, objData)
            # 字串出現於原始資料 有出現的話就加到compareAry之中
            self.compare_with_list(compareAry, objData)
        # 回傳兩個array
        return matchAry, compareAry

    def match_with_list(self, matchAry, objData):
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

    def compare_with_list(self, compareAry, objData):
        compareCon = self.compare(objData["qu_new"])
        if(compareCon == 1):
            obj = {
                "qu_new": objData["qu_new"],
                "qu_old": objData["qu_old"],
                "ans": objData["ans"],
                "con": compareCon
            }
            compareAry.insert(0, obj)
            if(len(compareAry) > 4):
                compareAry.pop()

    def getModel(self):
        return [
            {
                "qu_new": "",
                "qu_old": "",
                "ans": "",
                "con": 0
            }
        ]

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
