# coding=utf-8
import jieba

inputFile = open('textData\TaipeiQA.yml' , encoding = 'utf8')
outputFile = open('output.yml' , encoding = 'utf8',mode='a')
for line in inputFile:
    if line.find('- -')>=0:
        seg_list = jieba.cut(line)
        string = ' '.join(seg_list)
        outputFile.write(string)
    else:
        outputFile.write(line)

inputFile.close()
outputFile.close()
