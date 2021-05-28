var axios = require('axios')
var fs = require('fs');
const path = require('path');


var bodyParser = require('body-parser');
var express = require('express')

var nodemailer = require('nodemailer')
const puppeteer = require('puppeteer');
const readline = require('readline');

const {
    Console
} = require('console');

const e = require('express');
const PORT = process.env.PORT || 3000;
var auth = require('./auth.json');
const EventEmitter = require('events');

const emailToSendFrom = process.env.fromEmail || auth.fromEmail      //email to send from
const emailPassword = process.env.emailPassword || auth.emailPassword//password
const emailToSendTo = process.env.toEmail || auth.toEmail  //email to send to.   

//make sure this is a link to a search that only shows up one class. Search by CRN if you have to.
//example here is for CS344
let urlFirstHalf = "https://classes.oregonstate.edu/?keyword="
let urlSecondHalf = "&srcdb=999999"



let secondsInADay = 86400
let millisecondInADay = 1000 * secondsInADay;
let checksPerDay = 24;
let timeBetweenChecks = millisecondInADay/checksPerDay;

var app = express();

//READ THE README.MD IF THIS ISN"T WORKING!!!!
//or go here https://stackoverflow.com/questions/45478293/username-and-password-not-accepted-when-using-nodemailer
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailToSendFrom,
      pass: emailPassword
    }
  });

app.use(bodyParser.json({
    limit: '50mb'
}));

app.listen(PORT, function () {
    console.log("listening on port " + PORT); //don't start listening until connected.
})

app.get('/',(req,res)=>{
    res.send('Hello There!');
})




//assumes you're using gmail. Might need to change some stuff in nodemailer if you aren't.

        
const resultsFolderPath = "/resultsFolder/";

let lastEmailSentAt;

let firstTime = true;

let spacesLeft;
startListeningForClass();

function startListeningForClass(){
    lookForClass()
}

function sendErrorEmail(err){
    sendEmail("Error in Graph Creator","There's an error:" + err);
}

//thank god for stack overflow
//https://stackoverflow.com/questions/6156501/read-a-file-one-line-at-a-time-in-node-js
//

var currentTime;

async function lookForClass(){
    const fileStream = fs.createReadStream(path.join(__dirname,'/allCSCRNs.txt'));
    const rl = readline.createInterface({
        input:fileStream,
        crlfDelay:Infinity
    });
   // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.
    var wait = 0;
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds(); 
    currentTime = date + ' ' + time;
    for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
        //initializeFile(line);
      updateDataForClass(line,wait);
       wait += 10000;
       

    }
    setTimeout(lookForClass,timeBetweenChecks);
    
}

function initializeFile(line){
    var stringParts = line.split(',');
    var writeLine = stringParts[0] + ' -- ' + stringParts[1] + ' -- CRN:' + stringParts[2] + '\n';
    var nextLine = 'Time,Seats Left\n'
    writeLine += nextLine;
    fs.writeFile(path.join(__dirname,resultsFolderPath,stringParts[2]+'.csv'),writeLine,(err)=>{
        if(err){
            sendErrorEmail(err);
        }
        console.log("wrote file");
    })
}

function updateDataForClass(line,wait){
    var stringParts = line.split(',');
    var crn = stringParts[2];

    var url = urlFirstHalf + crn + urlSecondHalf;
    setTimeout(()=>{
        (async () => {
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.goto(url);
            await page.waitForSelector('.panel__body') //when this loads I know that the classes are loaded.
    
    
            //let bodyHTML =  await page.evaluate(()=>  document.querySelector('.panel__body').innerHTML);
            const element = await page.waitForSelector('.result');
            await element.click()
            
            await page.waitForSelector(".detail-ssbsect_seats_avail");
            
            
            const seatsAvailable = await page.evaluate(()=> document.querySelector('.detail-ssbsect_seats_avail').textContent);  
       
            let splitResult = seatsAvailable.split(':')
            
            let fixedResult = Number(splitResult[1].substr(1))
            spacesLeft = fixedResult;
            console.log(fixedResult, " seats left for: ",crn);
            updateFile(fixedResult,crn);
            await browser.close();
        })();
    },wait)
    
}
function updateFile(seatsLeft,crn){
    
    var totalPrompt = currentTime + ',' + String(seatsLeft) + '\n';
    fs.appendFile(path.join(__dirname,'/resultsFolder',String(crn)+".csv"),totalPrompt,
    {},(err)=>{
       if(err){
           sendErrorEmail(err);
       }
    });   
}
    

function sendEmail(emailSubject,emailText){
    var mailOptions = {
        from: emailToSendFrom,
        to: emailToSendTo,
        subject: emailSubject,
        text: emailText
      };
    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
    }
    });
}