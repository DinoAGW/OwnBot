const admins = ["dinoagw"];
const autostartProgramme = [
  "twitchChat",
  "mariadb",
  "hallo",
  "punkte",
  "duell",
  "rennen",
  "todo",
  "chatsync",
  "pet",
  "randomtest",
];
const DEBUG = true;

const channels = [
  "dinoagw"
//  , "lechtalnixe"
//  , "apexfabinatorxy"
//  , "smithhover"
];

const pwd = require('./Passwort.js');

const erlaubteProgramme = [
  
].concat(autostartProgramme);

const scriptname = "dinoagw_bot:";

const konstanten = require('./Konstanten.js');
const fork = require('child_process').fork;

var kinder = {};
var prefixe = {};

const timeTillTimeout = 90;

var eineAnfragenID = 1;
var offeneAnfragen = [];

var warteRaum = [];
var botRaum = [];


for ( let iter in autostartProgramme ) {
  erzeuge( autostartProgramme[iter] );
}
kinder["twitchChat"].send({
  type: konstanten.starteTwitchChat,
  script: "dinoagw_bot",
  username: "dinoagw_bot",
  password: pwd.dinoagw_bot,
  channels: channels
});

let anfrage = {
  id: 0
};
offeneAnfragen.push(anfrage);
kinder["mariadb"].send({
  type: konstanten.datenbankAbfrage,
  anfragenID: 0,
  query: "SELECT * FROM bot",
  variables: [ ]
});

var time = 0;
var anfragen = [];
setInterval(() => {
  time++;
  for (iter in anfragen) {
    if ( time >= anfragen[iter].time ) {
      let anfrage = anfragen[iter];
      anfragen.splice(iter, 1);
      iter--;
      anfrage.tu();
    }
  }
}, 1000);

var geheimModus = false;

function empfange(target, context, msg) {
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
  if ( username == target ) {
    isStreamer = true;
  }
  var isMod = context.mod;
  var isAdmin = admins.includes(username);

  for (var iter2 in prefixe ) {
    if ( prefixe[iter2].prefixe.includes(prefix) ) {
      prefixe[iter2].child.send({
        type: konstanten.befehl,
        prefix: prefix,
        argument: argument,
        target: target,
        username:  username,
        isStreamer: isStreamer,
        isMod: isMod,
        isAdmin: isAdmin
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
    
    if ( befehl == "notaus" && (isStreamer || isAdmin) ) {
      console.log( scriptname, "Beende mich nun");
      process.exit();
    }
    
    if ( befehl == "starte:" && isAdmin ) {
      kinder[argument].send({
        type: konstanten.befehl,
        prefix: "!stop",
        argument: argument
      });
      delete kinder[argument];
      delete prefixe[argument];
      if ( erlaubteProgramme.includes(argument) ) {
        erzeuge( argument );
        sende(target, "Gestartet.");
      } else {
        sende(target, "Das darf ich nich starten.");
      }
    }

    if ( befehl == "stoppe:" && isAdmin ) {
      kinder[argument].send({
        type: konstanten.befehl,
        prefix: "!stop",
        argument: argument
      });
      delete kinder[iter];
      delete prefixe[argument];
      sende(target, "Gestoppt.");
    }
    
    if ( befehl == "kinder:" && isAdmin ) {
      for ( var iter in kinder ) {
        kinder[iter].send({type: konstanten.nachricht, nachricht: argument});
        console.log(scriptname, "ausgegeben: ", {type: konstanten.nachricht, nachricht: argument});
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
      kinder = {};
      prefixe = {};
    }
    
    if ( befehl == "geheimmodus" && isAdmin ) {
      geheimModus = !geheimModus;
      if ( geheimModus ) {
        sende( target, "Geheimmodus aktiviert." );
      } else {
        sende( target, "Geheimmodus deaktiviert." );
      }
    }
  }
  if ( prefix == "!stopbot" ) {
    if ( isAdmin || isStreamer || isMod ) {
      let raum = botRaum[target];
      if ( raum != undefined ) {
        delete botRaum[target];
        sende( target, "@" + username + " Okay, machs gut =) dinoagw_bot Ende." );
        part( target );
        kinder["mariadb"].send({
          type: konstanten.datenbankEingabe,
          query: "UPDATE bot SET raum = 0 WHERE kanal = ?",
          variables: [ target ]
        });
      }
    }
  }
  if ( prefix == "@dinoagw_bot" ) {
    if ( argument.startsWith("ja_bot") ) {
      if ( isAdmin || isStreamer || isMod ) {
        let raum = warteRaum[target];
        if ( raum != undefined ) {
          delete warteRaum[target];
          botRaum[target] = raum;
          sende( target, "@" + username + " Dieser Kanal ist nun am dinoagw_bot angebunden." );
          kinder["mariadb"].send({
            type: konstanten.datenbankEingabe,
            query: "REPLACE INTO bot (kanal, raum) VALUES (?, ?)",
            variables: [ target, raum ]
          });
        }
      } else {
        console.log(context);
        sende( target, "@" + username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen." );
      }
    }
  }
  if ( prefix == "!invitebot" ) {
    if ( isAdmin ) {
      let kanal;
      let leerzeichenStelle = argument.indexOf(" ");
      if ( leerzeichenStelle == -1 ) {
        kanal = argument;
      } else {
        kanal = argument.substring(0, leerzeichenStelle);
      }
      if ( kanal.startsWith("@") ) {
        kanal = kanal.substring(1);
      }
      if ( botRaum[kanal] != undefined ) {
        sende( target, "@" + username + " " + kanal + " ist bereits im botRaum." );
      } else {
        //Zum Raum einladen
        kinder["twitchChat"].send({
          type: konstanten.joinTwitchChat,
          script: "dinoagw_bot",
          username: "dinoagw_bot",
          target: kanal,
        });
        sende( kanal, "Ihr Kanal hat eine Einladung erhalten dem dinoagw_bot-Raum beizutreten. Schreibe \"@dinoagw_bot ja_bot\" um die Einladung anzunehmen." );
        sende( target, "@" + username + " Anfrage an " + kanal + " gesendet." );
        warteRaum[kanal] = 1;
        let anfrage = {
          time: time+timeTillTimeout,
          tu: function (){
            if ( warteRaum[kanal] == 1 ) {
              delete warteRaum[kanal];
              sende( kanal, "timeout" );
              part( kanal );
              sende( target, "@" + username + " Einladung timeout (" + kanal + ")" );
            }
          }
        }
        anfragen.push(anfrage);
      }
    } else {
      sende( target, "@" + username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen." );
    }
  }
  if ( prefix == "!stopallbot" ) {
    if ( isAdmin ) {
      warteRaum = [];
      for ( let iter in botRaum ) {
        sende( iter, username + " beendet die dinoagw_bot-Anbindung für alle Kanäle." );
        part( iter );
      }
      botRaum = [];
      kinder["mariadb"].send({
        type: konstanten.datenbankEingabe,
        query: "UPDATE bot SET raum = 0",
        variables: [ ]
      });
    } else {
      sende( target, "@" + username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen." );
    }
  }
  if ( prefix == "!kickbot" ) {
    if ( isAdmin ) {
      //beende die Synchronisation für jemand Anderen
      let kanal;
      let leerzeichenStelle = argument.indexOf(" ");
      if ( leerzeichenStelle == -1 ) {
        kanal = argument;
      } else {
        kanal = argument.substring(0, leerzeichenStelle);
      }
      let raum = botRaum[kanal];
      if ( raum != undefined ) {
        delete botRaum[kanal];
        sende( kanal, username + " beendet die dinoagw_bot-Anbindung für diesen Kanal." );
        sende( target, "@" + username + " " + kanal + " Wurde aus dem dinoagw_bot-Raum entfernt." );
        part( target );
        kinder["mariadb"].send({
          type: konstanten.datenbankEingabe,
          query: "UPDATE bot SET raum = 0 WHERE kanal = ?",
          variables: [ kanal ]
        });
      } else {
        sende( target, "@" + username + " " + kanal + " ist nicht am dinoagw_bot angebunden." );
      }
    } else {
      sende( target, "@" + username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen." );
    }
  }
  if ( prefix == "!botstatus" ) {
    if ( isAdmin ) {
      let leer = true;
      for ( iter in warteRaum ) {
        leer = false;
        sende( target, "@" + username + " " + iter + " wartet im Warteraum." );
      }
      for ( iter in botRaum ) {
        leer = false;
        sende( target, "@" + username + " " + iter + " ist am dinoagw_bot angebunden." );
      }
      if ( leer ) {
        sende( target, "@" + username + " Die Warte- und BotRäume sind alle leer." );
      }
    } else {
      sende( target, "@" + username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen." );
    }
  }
}

function erzeuge(kind) {
  var program = `${__dirname}/${kind}.js`;
  var parameters = [];
  var options = {
    stdio: [ 'inherit', 'inherit', 'inherit', 'ipc' ]
  };
  var child = fork(program, parameters, options);
  child.on('message', (message) => {
    //if ( DEBUG ) console.log(scriptname, "Kind schreibt: ", message);
    if ( message.type == konstanten.sendeAnChat ) {
      sende(message.target, message.nachricht);
    }
    if ( message.type == konstanten.anwesend ) {
      prefixe[kind] = {
        child: child,
        prefixe: message.prefixe
      };
    }
    if ( message.type == konstanten.datenbankEingabe ) {
      kinder["mariadb"].send({
        type: konstanten.datenbankEingabe,
        query: message.query,
        variables: message.variables,
      });
    }
    if ( message.type == konstanten.datenbankAbfrage ) {
      console.log( scriptname, "datenbankAbfrage", message );
      let id = eineAnfragenID++;
      let anfrage = { id: id, child: child, anfragenID: message.anfragenID };
      kinder["mariadb"].send({
        type: konstanten.datenbankAbfrage,
        anfragenID: id,
        query: message.query,
        variables: message.variables,
      });
      offeneAnfragen.push(anfrage);
    }
    if ( message.type == konstanten.datenbankAntwort ) {
      console.log( scriptname, "datenbankAntwort", message.anfragenID );
      let anfrage;
      for ( let iter in offeneAnfragen ) {
        if ( offeneAnfragen[iter].id == message.anfragenID ) {
          anfrage = offeneAnfragen[iter];
          offeneAnfragen.splice(iter, 1);
          break;
        }
      }
      if ( anfrage.child==undefined ) {
        if ( DEBUG ) console.log( scriptname, "Datenbankantwort #"+message.anfragenID+" erhalten:", message );
        //wenn keine passende Anfrage gefunden wurde, was soll dann geschehen?
        if ( DEBUG ) console.log( scriptname, "Anfrage:", anfrage);
        if ( anfrage.id == 0 ) {
          //stelle die Verbindungen wieder her
          for ( let iter in message.res ) {
            if ( message.res[iter].raum>0 )
            {
              botRaum[message.res[iter].kanal] = message.res[iter].raum;
              join( message.res[iter].kanal );
            }
          }
        } else {
          console.log("Das sollte nicht passieren.");
        }
      } else {
        anfrage.child.send({
          type: konstanten.datenbankAntwort,
          anfragenID: anfrage.anfragenID,
          res: message.res,
        });
      }
    }
    if ( message.type == konstanten.erinnereMich ) {
      let anfrage = {
        time: time+message.time,
        tu: function (){child.send(message.nachricht);}
      }
      anfragen.push(anfrage);
    }
    if ( message.type == konstanten.empfangeVonTwitchChat ) {
      console.log( scriptname, "empfangeVonTwitch", message.script, message.username, message.target, message.msg );
      if ( message.script == "dinoagw_bot" ) {
        empfange( message.target, message.context, message.msg );
      } else {
        kinder[message.script].send({
          type: konstanten.empfangeVonTwitchChat,
          script: message.script,
          username: message.username,
          target: message.target,
          context: message.context,
          msg: message.msg
        })
      }
    }
    if ( message.type == konstanten.starteTwitchChat ) {
      kinder["twitchChat"].send({
        type: konstanten.starteTwitchChat,
        script: message.script,
        username: message.username,
        password: message.password,
        channels: message.channels
      });
    }
    if ( message.type == konstanten.sendeAnTwitchChat ) {
      kinder["twitchChat"].send({
        type: konstanten.sendeAnTwitchChat,
        script: kind,
        username: message.username,
        target: message.target,
        nachricht: message.nachricht,
      });
    }
    if ( message.type == konstanten.joinTwitchChat ) {
      kinder["twitchChat"].send({
        type: konstanten.joinTwitchChat,
        script: message.script,
        username: message.username,
        target: message.target,
      });
    }
    if ( message.type == konstanten.partTwitchChat ) {
      kinder["twitchChat"].send({
        type: konstanten.partTwitchChat,
        script: message.script,
        username: message.username,
        target: message.target
      });
    }
  });
  child.on('error', (err) => {
    console.log(scriptname, kind + " gibt einen Fehler aus: " + err);
    delete kinder[kind];
    delete prefixe[kind];
  });
  kinder[kind] = child;
  return child;
}

function join( kanal ) {
  kinder["twitchChat"].send({
    type: konstanten.joinTwitchChat,
    script: "dinoagw_bot",
    username: "dinoagw_bot",
    target: kanal,
  });
}

function part( kanal ) {
  kinder["twitchChat"].send({
    type: konstanten.partTwitchChat,
    script: "dinoagw_bot",
    username: "dinoagw_bot",
    target: kanal
  });
}

function sende(target, nachricht) {
  if ( geheimModus ) {
    nachricht = "~" + nachricht;
  }
  kinder["twitchChat"].send({
    type: konstanten.sendeAnTwitchChat,
    script: "dinoagw_bot",
    username: "dinoagw_bot",
    target: target,
    nachricht: nachricht
  });
}
