# coding=utf-8
import jieba

inputFile = open('textData\TaipeiQA.yml' , encoding = 'utf8')
outputFile = open('output.yml' , encoding = 'utf8',mode='a')

punct = set(u''':!),.:;?]}¢'"、。〉》」』】〕〗〞︰︱︳﹐､﹒
﹔﹕﹖﹗﹚﹜﹞！），．：；？｜｝︴︶︸︺︼︾﹀﹂﹄﹏､～￠
々‖•·ˇˉ―--′’”([{£¥'"‵〈《「『【〔〖（［｛￡￥〝︵︷︹︻
︽︿﹁﹃﹙﹛﹝（｛“‘-—_…''')
# 對str/unicode
filterpunt = lambda s: ' '.join(filter(lambda x: x not in punct, s))
# 對list
filterpuntl = lambda l: list(filter(lambda x: x not in punct, l))


for line in inputFile:
    if line.find('- -')>=0:
        seg_list = jieba.cut(line)
        string=filterpunt(seg_list)
        outputFile.write( '-   -' + string + '\n' )
    else:
        outputFile.write(line)

inputFile.close()
outputFile.close()
