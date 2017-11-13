
// 1. Text strings =====================================================================================================
//    Modify these strings and messages to change the behavior of your Lambda function
var http = require('http');

const SKILL_NAME = "OB";



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
        //this.response.speak(say).listen(say);
        //this.emit(':responseReady');
        this.emit(':ask', say, say);
    },

    'TransactionsIntent': function () {
        getTransactions( (output) => {   
			var repeatMessage = "You can check your balance or can make a payment";         
			this.emit(':ask', output, repeatMessage);
        });
    },
    'PostPaymentIntent': function () {
        postPayment( (  returnData) => {

            var say = " Your payment completed successfully "+ returnData;
            this.response.speak(say);
            this.emit(':tell', say, "enjoy your purchase");

        });
    },
    'SendMoneyIntent': function (amount) {
            var speech = new Speech();
			speech.say(" You want to spend"+amount+ "but you have a mortgage payment due on 17th this month");
			speech.pause('500ms');
            speech.say("if you make this payment, then you might not be able to keep your mortgage payment");			
			speech.pause("500ms");
			speech.say("it can cause you you some pain later. May be use phone a friend or ask the audience?");
			speech.pause("500ms");
			var speechOutput = speech.ssml(true);  
            this.emit(':tell', speechOutput);
    },

    'GetBalanceIntent': function () {
        getBalance( ( balance,  returnData) => {
            var speech = new Speech();
            speech.say("Your account balance is "+balance+" pounds");
            speech.pause('300ms');
            speech.say("life is beautiful");
			speech.pause('100ms');
            speech.say("You can check your transaction history or can make a payment");  
			var repeat = ("You can check your transaction history or can make a payment");  		
            var speechOutput = speech.ssml(true);            
            this.emit(':ask', speechOutput, repeat);
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


function getBalance(callback) {
    var req = http.request(balanceOptions, res => {
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });
        res.on('end', () => {
            
           var channelObj = JSON.parse(returnData);
           var result = util.inspect(channelObj, {showHidden: false, depth: null})
           var code = channelObj.balance;
           
            callback(code,result);


        });

    });
    req.end();
}

function getTransactions(account,callback) {
    
    const transactionOptions = {
    host: 'www.sapebank-service.herokuapp.com',
    path: '/transactions/'+account,
    method: 'GET',
    'Content-Type': 'application/json'
};
    var req = http.request(transactionOptions, res => {
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

function postPayment(callback) {
    
    var req = http.request(options, res => {
        res.setEncoding('utf8');
        
        var returnData = "";

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });
        res.on('end', () => {
            
           var channelObj = JSON.parse(returnData);
           var result = util.inspect(channelObj, {showHidden: false, depth: null})         
           callback(result);

        });

    });
    var postData = '{"Data": { "PaymentId": "7290", "Initiation": { "InstructionIdentification": "ANSM023", "EndToEndIdentification": "FRESCO.21302.GFX.37", "InstructedAmount": { "Amount": "50.12", "Currency": "GBP" }, "DebtorAccount": { "SchemeName": "SortCodeAccountNumber", "Identification": "01020301020304", "Name": "Archana Dixit" }, "CreditorAccount": { "SchemeName": "SortCodeAccountNumber", "Identification": "02030402030405", "Name": "Gareth Down"}, "RemittanceInformation": { "Reference": "Payment for iphone", "Unstructured": "Internal ops code 5120103" } } }, "Risk": { "PaymentContextCode": "PersonToPerson" }}';
    req.write(postData);
    req.end();
}



function randomArrayElement(array) {
    var i = 0;
    i = Math.floor(Math.random() * array.length);
    return(array[i]);
}
