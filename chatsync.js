const pwd = require('./Passwort.js');

const tmi = require('tmi.js');
const mariadb = require('mariadb');
//var List = require("collections/list");
const pool = mariadb.createPool({
     host: 'localhost', 
     user:'chatsync', 
     password: pwd.mariadb,
     database: 'db1',
     connectionLimit: 5
});

var allChannels = ["dinoagw"];
// Define configuration options
const opts = {
  identity: {
    username: "chatsync",
    password: pwd.chatsync
  },
  connection: {
    reconnect: true
  },
  channels: [
    "dinoagw"
    //, "chilledgrizzlygaming"
//    , "rhokassiopeia"
    //, "lechtalnixe"
    //, "wieheisstder"
    //, "ladys_pleasure"
//    , "redandblacker"
    //, "hunkykay"
    //, "heotthecasual"
  ]
};
// Create a client with our options
var client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();



// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  
  if (context.username == client.getUsername()) {
	  //console.log("kann wirklich passieren");
	  return;
  }

  // Remove whitespace from chat message
  const commandName = msg.trim();
  
  if (commandName.toLowerCase() == '!stopsync') {
    var permission = false;
    if ("#"+context.username == target || context.mod) {
      permission = true;
    }
    if (permission) {
      if (target == "#dinoagw") {
        var rundmail = target + " hat die Synchronisation für alle beendet.";
        for (var index in allChannels) {
          client.say("#"+allChannels[index], rundmail).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
          if (index>0) {
            client.part(allChannels[index]).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
          }
        }
        allChannels = ["dinoagw"];
      } else {
        var rundmail = "Synchronisation wird für diesen Kanal beendet.";
        client.say(target, rundmail).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        client.part(target).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        for (var index in allChannels) {
          if (target == "#" + allChannels[index]) {
            allChannels.splice(index, 1);
            break;
          }
        }
        rundmail = target + " hat die Synchronisation für sich beendet.";
        for (var index in allChannels) {
          client.say("#"+allChannels[index], rundmail).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        }
      }
    } else {
      var rundmail = "Dies dürfen nur die Streamer/innen und deren Mods.";
      client.say(target, rundmail).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
    }
  }
    
  if (commandName.toLowerCase() == '!multi') {
    try {
      var rundmail2 = "Hier: https://multistre.am";
      for (var index in allChannels) {
        rundmail2 = rundmail2 + "/" + allChannels[index];
      }
      rundmail2 = rundmail2 + " könnt Ihr uns gemeinsam schauen";
      client.say(target, rundmail2).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
    } catch(err) {
      console.log(`* err = ${err}`);
    }
  }
    
  var cmd = '!invite';
  if (commandName.toLowerCase().startsWith(cmd+' ')) {
    var arg = commandName.substring(cmd.length+1);
    try {
      var permission = false;
      if ("#"+context.username == target || context.mod) {
        permission = true;
      }
      if (permission) {
        client.say(target, "Anfrage an '" + arg + "' gesendet.").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        client.join(arg).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        var rundmail = "Sie haben eine Einladung erhalten mit ";
        for(index in allChannels) {
          if (index>0) {
            rundmail += ", ";
          }
          rundmail += allChannels[index];
        }
        rundmail += " die Kanäle zu verbinden. Schreibe \"@chatsync ja\" um die Einladung anzunehmen.";
        client.say("#" + arg, rundmail).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        setTimeout(function() {
          if (!allChannels.includes(arg)) {
            client.say("#" + arg, "timeout").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
            client.part("#" + arg).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
            setTimeout (function() {
              if (allChannels.includes(arg)){
                client.join("#" + arg).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
              }
            }, 1000);
          }
        }, 60000);
      } else {
        client.say("#" + arg, "Dies dürfen nur die Streamer/innen und deren Mods.").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
      }
    } catch(err) {
      console.log(`* err = ${err}`);
    }
  }

  if (commandName.toLowerCase().startsWith("@chatsync ja")) {
    try {
      var permission = false;
      if ("#"+context.username == target || context.mod) {
        permission = true;
      }
      if (permission) {
        allChannels.push(target.substring(1));
        rundmail = "Die folgenden Chats werden nun synchronisiert:";
        for(index in allChannels) {
          if (index>0) {
            rundmail = rundmail + ",";
          }
          rundmail = rundmail + ' ' + allChannels[index];
        }
        rundmail = rundmail + ". Nachrichten die mit ~ beginnen werden nicht übermittelt. Mit !multi kriegt Ihr einen Multistream Link.";
        var arrayLength = allChannels.length;
        for (var index = 0; index < arrayLength; index++) {
          client.say("#"+allChannels[index], rundmail).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        }
      } else {
        client.say("#" + arg, "Dies dürfen nur die Streamer/innen und deren Mods.").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
      }
    } catch(err) {
      console.log(`* err = ${err}`);
    }
  }
  
  var cmd = '!ismod';
  if (commandName.toLowerCase().startsWith(cmd+' ')) {
    var arg = commandName.substring(cmd.length+1);
    try {
      client.mods(target).then((data) => {
        console.log(`* data = ${data}`);
        
        var found = false;
        for (var i = 0; i < data.length; i++) {
          if (data[i] == arg) {
            found = true;
            break;
          }
        }
        
        if (found) {
          client.say(target, "jup").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        } else {
          client.say(target, "nö").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        }
      }).catch((err)=>{console.log(`* err = ${err}`);});
    } catch(err) {
      console.log(`* err = ${err}`);
    }
  }
   
  var cmd = '!todo';
  if (commandName.toLowerCase().startsWith(cmd+' ')) {
    var arg = commandName.substring(cmd.length+1);
    try {
      var permission = false;
      if ("#"+context.username == target || context.mod) {
        permission = true;
      }
      if (permission) {
        if (arg.length>1000) {
          client.say(target, "zu lang").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        } else {
          insertIntoTodo(arg);
          client.say(target, "gemerkt").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
        }
      } else {
        client.say(target, "nö").then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
      }
    } catch(err) {
      console.log(`* err = ${err}`);
    }
  }
    
  if ((commandName.charAt(0) !== '~')&&(commandName.charAt(0) !== '!')) {
    for (var index in allChannels) {
      if ( "#"+allChannels[index] !== target ) {
        client.say("#"+allChannels[index], `${context.username}: ${commandName}`).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
      }
    }
  }
}

async function insertIntoTodo(value) {
  let conn;
  try {
    conn = await pool.getConnection().catch((err)=>{console.log(err);});
    //const rows = await conn.query("SELECT 1 as val");
    //console.log(rows); //[ {val: 1}, meta: ... ]
    const res = await conn.query("INSERT INTO todo ( text, status ) VALUE ( ?, 'open')", [ value ]).catch((err)=>{console.log(err);});
    console.log(res); // { affectedRows: 1, insertId: 1, warningStatus: 0 }
  } catch (err) {
    console.log("oh, Schade =(");
    throw err;
  } finally {
    if (conn) return conn.end();
  }
}

// Called every time the bot connects to Twitch chat
async function onConnectedHandler (addr, port) {
  try {
    console.log(`* Connected to ${addr}:${port}`);
    setTimeout(function() {
      var rundmail = "Die folgenden Chats werden nun synchronisiert:";
      for (var index in allChannels) {
        if (index>0) {
          rundmail = rundmail + ",";
        }
        rundmail = rundmail + ' ' + allChannels[index];
      }
      rundmail = rundmail + ". Nachrichten die mit ~ beginnen werden nicht übermittelt. Schreibe !stopsync um die Synchronisierung zu beenden. Mit !multi kriegt Ihr einen Multistream Link.";
      
      var arrayLength = allChannels.length;
      for (var index = 0; index < arrayLength; index++) {
        client.say("#"+allChannels[index], rundmail).then((data) => {console.log(`* data = ${data}`);}).catch((err)=>{console.log(`* err = ${err}`);});
      }
    }, 1000);
  } catch(err) {
    console.log(`* err = ${err}`);
  }
}
