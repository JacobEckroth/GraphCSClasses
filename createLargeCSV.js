const fs = require('fs')
const path = require('path')




function createLargeCSV(resultsDirLocation,outputName){
    fs.readdir(resultsDirLocation,function(err,files){
        if(err){
            return console.log("unable to scan directory: " + err);
        }
        pathNames = []
        files.forEach(function(file){
            
            pathNames.push(path.join(__dirname,"resultsFolder",file));

        })
        
        var fileData = []
        for(var i = 0; i < pathNames.length; i++){
            fileData.push(fs.readFileSync(pathNames[i],'utf-8'));
        }
        var lines = []
        for(var i = 0; i < pathNames.length; i++){
            lines[i] = fileData[i].split(/\r?\n/);
        }
        writeLinesToCSV(lines,outputName);


    })
}

function writeLinesToCSV(lines,outputFileName){
    var writeString = ""
    writeString += ","
    var fileAmount = lines.length;
    for(var i = 0; i < fileAmount; i++){
        writeString += lines[i][0]
        if(i !== fileAmount - 1){
            writeString += ","
        }
    }
    writeString += "\n" //end of headers.
    for(var lineLocation = 2; lineLocation < lines[0].length; lineLocation++){
        var currentTime = lines[0][lineLocation].split(',')[0]
        writeString += currentTime
        writeString += ",";
        for(var fileChoice = 0; fileChoice < fileAmount; fileChoice++){
            writeString += lines[fileChoice][lineLocation].split(',').pop();
            if(fileChoice !== fileAmount - 1){
                writeString += ","
            }
        }
        writeString += "\n"
        fs.writeFile(path.join(__dirname,outputFileName),writeString,(err)=>{
            if(err) throw err;
        })
    }
}



createLargeCSV(path.join(__dirname,"resultsFolder"),"test.csv")