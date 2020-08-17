const admins = ["dinoagw"];
const autostartProgramme = [
  "hallo",
  "punkte",
  "duell",
  "rennen"
];
const erlaubteProgramme = [
  
].concat(autostartProgramme);

const DEBUG = false;

const pwd = require('./Passwort.js');
const konstanten = require('./Konstanten.js');
const tmi = require('tmi.js');
const mariadb = require('mariadb');
const fork = require('child_process').fork;

const pool = mariadb.createPool({
     host: 'localhost', 
     user:'chatsync', 
     password: pwd.mariadb,
     database: 'db1',
     connectionLimit: 5
});

const opts = {
  identity: {
    username: "dinoagw_bot",
    password: pwd.dinoagw_bot
  },
  connection: {
    reconnect: true
  },
  channels: [
    "dinoagw"
//    , "lechtalnixe"
//    , "apexfabinatorxy"
//    , "smithhover"
  ]
};
var client = new tmi.client(opts);

var kinder = [];
var prefixe = [];
//var child;

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.connect();
for ( iter in autostartProgramme ) {
  erzeuge( autostartProgramme[iter] );
}


var time = 0;
var anfragen = [];
setInterval(() => {
  time++;
  for (iter in anfragen) {
    if ( time >= anfragen[iter].time ) {
      let anfrage = anfragen[iter];
      anfragen.splice(iter, 1);
      iter--;
      anfrage.child.send(anfrage.nachricht);
    }
  }
}, 1000);


function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  
  if (context.username == client.getUsername()) {
	  console.log("kann wirklich passieren");
	  return;
  }
  var nachricht = msg.trim();
  var geheim = false;
  if (nachricht.startsWith("~")) {
    geheim = true;
    nachricht = nachricht.substring(1);
  }
  var isCommand = false;
  var befehl;
  var argument;
  var endeDesBefehls = nachricht.indexOf(" ");
  var prefix;
  if( endeDesBefehls == -1 ) {
    prefix = nachricht.toLowerCase();
    argument = "";
  } else {
    prefix = nachricht.slice(0, endeDesBefehls).toLowerCase();
    argument = nachricht.substring(prefix.length + 1);
  }
  let myPrefix = "!";
  if ( nachricht.startsWith(myPrefix) ) {
    isCommand = true;
    befehl = prefix.substring(myPrefix.length);
  }
  var username = context.username;
  var isStreamer = false;
  if ( "#" + username == target ) {
    isStreamer = true;
  }
  var isMod = context.mod;
  var isAdmin = admins.includes(username);

  for (var iter2 in prefixe ) {
    if ( prefixe[iter2].prefixe.includes(prefix) ) {
      prefixe[iter2].process.send({
        type: konstanten.befehl,
        prefix: prefix,
        argument: argument,
        target: target,
        username:  username,
        isSreamer: isStreamer,
        isMod: isMod
      });
    }
  }
  
  if ( isCommand ) {
    if ( befehl == "status" ) {
      let nachrichtToSend = "Hallo " + username + ". Du bist";
      if (!isStreamer) nachrichtToSend += " nicht";
      nachrichtToSend += " der Streamer dieses Kanals. Du bist"
      if (!isMod) nachrichtToSend += " nicht";
      nachrichtToSend += " Mod auf diesem Kanal. Du bist";
      if (!isAdmin) nachrichtToSend += " nicht";
      nachrichtToSend += " Admin des dinoagw_bot's."
      if ( argument != "" ) {
        nachrichtToSend += " Das Argument ist: '" + argument + "'.";
      }
      sende(target, nachrichtToSend);
    }
    
    if ( befehl == "starte:" && isAdmin ) {
      if ( erlaubteProgramme.includes(argument) ) {
        erzeuge( argument );
      } else {
        sende(target, "Das darf ich nich starten.");
      }
    }
    
    if ( befehl == "kinder:" && isAdmin ) {
      for ( var iter in kinder ) {
        kinder[iter].send({type: konstanten.nachricht, nachricht: argument});
        console.log("ausgegeben: ", {type: konstanten.nachricht, nachricht: argument});
      }
    }
    
    if ( befehl == "stop" && isAdmin ) {
      for ( var iter in kinder ) {
        kinder[iter].send({
          type: konstanten.befehl,
          prefix: "!stop",
          argument: argument
        });
      }
      kinder = [];
      prefixe = [];
    }
  }
}

function erzeuge(kind) {
  var program = `${__dirname}/${kind}.js`;
  var parameters = [];
  var options = {
    stdio: [ 'inherit', 'inherit', 'inherit', 'ipc' ]
  };
  let child = fork(program, parameters, options);
  child.on('message', async (message) => {
    if ( DEBUG ) console.log("Kind schreibt: ", message);
    if ( message.type == konstanten.sendeAnChat ) {
      sende(message.target, message.nachricht);
    }
    if ( message.type == konstanten.anwesend ) {
      prefixe.push({
        process: child,
        prefixe: message.prefixe
      });
    }
    if ( message.type == konstanten.datenbankEingabe ) {
      let conn;
      let res;
      try {
        conn = await pool.getConnection();
        if ( DEBUG ) console.log("Datenbankeingabe: ", message.query, message.variables);
        res = await conn.query(message.query, message.variables);
        if ( DEBUG ) console.log("Datenbankeingabe ergab: ", res);
      } catch (err) {
        console.log("Datenbankanfrage fehlgeschlagen: ", message.query, " " , message.variables);
        throw err;
      } finally {
        if (conn) return conn.end();
      }
    }
    if ( message.type == konstanten.datenbankAbfrage ) {
      let conn;
      let res;
      if ( DEBUG ) console.log("Datenbankabfrage: ", message.query, message.variables);
      try {
        conn = await pool.getConnection();
        res = await conn.query(message.query, message.variables);
        if ( DEBUG ) console.log("Datenbankabfrage ergab: ", res);
        child.send({
          type: konstanten.datenbankAntwort,
          anfragenID: message.anfragenID,
          res: res
        });
      } catch (err) {
        console.log("Datenbankanfrage fehlgeschlagen: ", message.query, " " , message.variables);
        throw err;
      } finally {
        if (conn) return conn.end();
      }
    }
    if ( message.type == konstanten.erinnereMich ) {
      let anfrage = {
        time: time+message.time,
        child: child,
        nachricht: message.nachricht
      }
      anfragen.push(anfrage);
    }
  });
  child.on('error', (err) => {
    console.log("Kind gibt einen Fehler aus: " + err);
  });
  kinder.push(child);
}

function sende(target, nachricht) {
  try {
    client.say(target, nachricht)
      .then(
        (data) => {console.log(`* data = ${data}`);}
      )
      .catch(
        (err) => {console.log(`* err = ${err}`);}
      );
  } catch(err) {
    console.log(`* err = ${err}`);
  }
}

function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
