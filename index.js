// 1. Text strings =====================================================================================================
//    Modify these strings and messages to change the behavior of your Lambda function

const SKILL_NAME = "OB";

const transactionOptions = {
    host: 'sapebank-service.herokuapp.com',
    path: '/transactions/',
    method: 'GET',
    'Content-Type': 'application/json'
};

const balanceOptions = {
    host: 'sapebank-service.herokuapp.com',
    path: '/accounts/',
    method: 'GET',
    'Content-Type': 'application/json'
};


const options = {
    host: 'sapebank-service.herokuapp.com',
    path: '/payment-submissions',
    method: 'POST',
    headers: {
    'Content-Type': 'application/json'
    }
};

// 2. Skill Code =======================================================================================================

const Alexa = require('alexa-sdk');
const util = require('util');
const http = require('http');
const querystring = require('querystring');
const Speech = require('ssml-builder');

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    //alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest': function () {
        var say = "Welcome to Lloyds Bank. You can check your account balance, get transaction history or you can make a payment";
        this.emit(':ask', say, say);
    },

    'TransactionsIntent': function () {
        var account;
        if(!this.event.request.intent.slots.account.value){
            account = '01020304';
        } else {
            account = this.event.request.intent.slots.account.value.toString();
        }     
        getTransactions(account, (output) => {   
			var repeatMessage = "You can check your balance or can make a payment";         
			this.emit(':ask', output, repeatMessage);
        });
    },
    'PostPaymentIntent': function () {
        var account;
        if(!this.event.request.intent.slots.account.value){
            account = '02030402030405';
        } else {
            account = this.event.request.intent.slots.account.value.toString();
            
        }     
        postPayment( account,  (output) => {
            var say = " Your payment completed successfully "+ output;
            this.response.speak(say);
            this.emit(':tell', say, "enjoy your day");

        });
    },
    'SendMoneyIntent': function () {
        //TODO Plug ML Model for upsell
    },

    'GetBalanceIntent': function () {
        var account;
        var balance;
        var repeat = ("You can check your transaction history or can make a payment"); 
        if(!this.event.request.intent.slots.account.value){
            account = '01020304';
        } else {
            account = this.event.request.intent.slots.account.value.toString();
        }  
        getBalance(account, (output) => {   
			var repeatMessage = "You can check your transactions or can make a payment"; 
			
            var speech = new Speech();
            speech.say(output);
            speech.pause('300ms');
            speech.say("life is beautiful");
			speech.pause('100ms');
            speech.say("You can check your transaction history or can make a payment");
            var speechOutput = speech.ssml(true);            
            this.emit(':ask', speechOutput, repeatMessage);       
			
			//this.emit(':ask', output, repeatMessage);
        });
        
    },

    'AMAZON.NoIntent': function () {
        this.emit('AMAZON.StopIntent');
    },
    'AMAZON.HelpIntent': function () {
        this.response.speak(this.t('HELP')).listen(this.t('HELP'));
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(this.t('STOP'));
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest': function () {
        this.response.speak(this.t('STOP'));
        this.emit(':responseReady');
    }

};

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================


function getBalance(account, callback) {
    balanceOptions.path = balanceOptions.path+account;
    var req = http.request(balanceOptions, res => {
        res.setEncoding('utf8');
        var returnData = "";
        res.on('data', chunk => {
            returnData = returnData + chunk;
        });
        res.on('end', () => {
            try {
                var channelObj = JSON.parse(returnData);
                result = util.inspect(channelObj, {showHidden: false, depth: null})
                balance = channelObj.balance;
                output = "Your account balance is "+balance+" pounds";
                callback(output);
               
            } catch(e) {
                output = "Apologies, There was an error in fetching account balance for account "+account;
                callback(output);
            }

        });

    });
    req.end();
}


function getTransactions(account, callback) {
        transactionOptions.path = (transactionOptions.path+account);
        var req = http.request(transactionOptions , res => {
        res.setEncoding('utf8');
        var returnData = "";
        res.on('data', chunk => {
            returnData = returnData + chunk;
        });
        
        res.on('end', () => {
           var output = "";    
           var channelObj = JSON.parse(returnData);
           var totalObjects = Math.min(Object.keys(channelObj).length, 3);
            var i = 0;
            
			var speech = new Speech();
            while (i < totalObjects) {
            //while (i < 2) {         
                               
				speech.say(" transaction "+(i+1));
				speech.pause("100ms");
				speech.say(" amount in pounds "+channelObj[i].out);
				speech.pause("100ms");
				speech.say(' Reference '+ channelObj[i].description);
				speech.pause("500ms");			
				i += 1;
                
            }			
			var speechOutput = speech.ssml(true);   
			callback(speechOutput);
			
        });

    });
    req.end();
}

function postPayment(account, callback) {
   //TODO pass paymentId, amount, account and reference to construct payment submission json
   // Can add payment setup to wire the info 
    var req = http.request(options, res => {
        res.setEncoding('utf8');
        var returnData = "";
        res.on('data', chunk => {
            returnData = returnData + chunk;
        });
        res.on('end', () => {
           var channelObj = JSON.parse(returnData);
           var output = util.inspect(channelObj, {showHidden: false, depth: null})         
           callback(output);

        });

    });
    //TODO : substitute reference, payment id, amount and account number in post 
    var postData = '{"Data": { "PaymentId": "7290", "Initiation": { "InstructionIdentification": "ANSM023", "EndToEndIdentification": "FRESCO.21302.GFX.37", "InstructedAmount": { "Amount": "50.12", "Currency": "GBP" }, "DebtorAccount": { "SchemeName": "SortCodeAccountNumber", "Identification": "01020301020304", "Name": "Archana Dixit" }, "CreditorAccount": { "SchemeName": "SortCodeAccountNumber", "Identification":"02030402030405", "Name": "Gareth Down"}, "RemittanceInformation": { "Reference": "Payment for iphone", "Unstructured": "Internal ops code 5120103" } } }, "Risk": { "PaymentContextCode": "PersonToPerson" }}';
    var jsonObject = JSON.parse(postData);
    req.write(postData);
    req.end();
}



function randomArrayElement(array) {
    var i = 0;
    i = Math.floor(Math.random() * array.length);
    return(array[i]);
}
