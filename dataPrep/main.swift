//
//  main.swift
//  test_swift4
//
//  Created by 張語航 on 2017/8/22.
//  Copyright © 2017年 張語航. All rights reserved.
//

import Foundation

func tokenize(sentence: String) -> [String] {
    var tokens:[String] = [String]()
    
    let tagger = NSLinguisticTagger(tagSchemes: [.tokenType], options: 0)
    
    tagger.string = sentence
    let range = NSMakeRange(0, sentence.utf16.count)
    let options: NSLinguisticTagger.Options = [.omitWhitespace, .omitPunctuation]
    
    if #available(OSX 10.13, *) {
        tagger.enumerateTags(in: range, unit: .word, scheme: .tokenType, options: options) { (tag, tokenRange, stop) in
            let word = (sentence as NSString).substring(with: tokenRange)
            tokens.append(word)
        }
    } else {
        // Fallback on earlier versions
    }
    
    return tokens
}

let path = NSHomeDirectory() + "/Desktop/code/ChatBotTaipeiCityHall/textData/"
let inputFileName = "TaipeiQA.yml"
let outputFileName = "output.yml"
do {
    let content = try String(contentsOfFile: path + inputFileName)
    let lines = content.components(separatedBy: "\n")
    var str = ""
    var count = 0
    for line in lines {
        if (line.hasPrefix("- - ")) {
            let tokens = tokenize(sentence: line)
            str += "- - \(tokens.joined(separator: " "))\n"
            count += 1
        } else {
            str += line + "\n"
        }
    }
    print(count)
    try str.write(toFile: path + outputFileName, atomically: false, encoding: String.Encoding.utf8)
} catch {
    print(error)
}

