var fs = require('fs')
fs.readFile('PortalFaq.json',function(err,data) {//读取同目录下的book.json文件
    if(err) {throw err;}
			console.log(data);
	var jsonOBJ = JSON.parse(data);
	var temp1 = jsonOBJ['SearchPortalContentResult'];
	var temp2 = temp1['TaipeiPortalData'];
	var temp3 = temp2['data'];
	var output = ""
	for (var i = 0; i < temp3.length; i++) {
		var temp = temp3[i];
		output = output + temp['Title'] + "\n" + temp['Content'] + "\n";
		output += "\n";
	}
	fs.writeFile('Data.txt',output,function(err){
        if(err) throw err;
        console.log('write JSON into TEXT');
    });
});
