const admins = ["dinoagw"];
const DEBUG = true;

const pwd = require('./Passwort.js');

const konstanten = require('./Konstanten.js');
const myPrefixe = [
  "!invitebot",
  "!stopallbot",
  "!kickbot",
  "!botstatus"
];

const scriptname = "more_dinoagw_bot:";

const timeTillTimeout = 30;

var offeneAnfragen = [];

var warteRaum = [];
var botRaum = [];

process.send({
  type: konstanten.starteTwitchChat,
  script: "more_dinoagw_bot",
  username: "dinoagw_bot",
  password: pwd.dinoagw_bot,
  channels: []
});

function empfange (target, context, msg) {
  var nachricht = msg.trim();
  var geheim = false;
  if ( nachricht.startsWith("~") ) {
    geheim = true;
    nachricht = nachricht.substring(1);
  }
  if ( nachricht.startsWith("!") ) geheim = true;
  if ( context.username == "dinoagw_bot" ) geheim = true;
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
  var username = context.username;
  var isStreamer = false;
  if ( username == target ) {
    isStreamer = true;
  }
  var isMod = context.mod;
  var isAdmin = admins.includes(username);

  if ( prefix == "!stopbot" ) {
    if ( isAdmin || isStreamer || isMod ) {
      let kanal = target;
      let raum = botRaum[kanal];
      if ( raum != undefined ) {
        delete botRaum[kanal];
        sende( target, "@" + username + " Okay, machs gut =) dinoagw_bot Ende." );
        part( target );
        process.send({
          type: konstanten.datenbankEingabe,
          query: "UPDATE bot SET raum = 0 WHERE kanal = ?",
          variables: [ kanal ]
        });
      }
    }
  }
  if ( prefix == "@dinoagw_bot" ) {
    if ( isAdmin || isStreamer || isMod ) {
      if ( argument.startsWith("ja_bot") ) {
        let kanal = target;
        let raum = warteRaum[kanal];
        if ( raum != undefined ) {
          delete warteRaum[kanal];
          botRaum[kanal] = raum;
          sende( target, "@" + username + " Dieser Kanal ist nun am dinoagw_bot angebunden." );
          process.send({
            type: konstanten.datenbankEingabe,
            query: "REPLACE INTO bot (kanal, raum) VALUES (?, ?)",
            variables: [ kanal, raum ]
          });
        }
      }
    } else {
      sende( target, "@" + username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen." );
    }
  }
  if ( prefix != "!stopbot" && prefix != "@dinoagw_bot" ) {
    process.send({
      type: konstanten.empfangeVonTwitchChat,
      target: target,
      context: context,
      msg: msg
    });
  }
}

process.on('message', (message) => {
  if ( DEBUG ) console.log( scriptname, "Message:", message );
  if ( message.type == konstanten.erinnereMich ) {
    //Anfrage Timeout
    if ( warteRaum[message.kanal] == 1 ) {
      delete warteRaum[message.kanal];
      sende( message.kanal, "timeout" );
      part( message.kanal );
      process.send({
        type: konstanten.sendeAnChat,
        target: message.target,
        nachricht: "@" + message.username + " timeout"
      });
    }
  }

  if ( message.type == konstanten.datenbankAntwort ) {
    if ( DEBUG ) console.log( scriptname, "Datenbankantwort #"+message.anfragenID+" erhalten:", message );
    let anfrage;
    for ( let iter in offeneAnfragen ) {
      if ( offeneAnfragen[iter].id == message.anfragenID ) {
        anfrage = offeneAnfragen[iter];
        offeneAnfragen.splice(iter, 1);
        break;
      }
    }
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
    }
  }
  
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      console.log( scriptname, "Beende mich nun");
      process.exit();
    }
    if ( message.prefix == "!invitebot" ) {
      if ( message.isAdmin ) {
        let kanal;
        let leerzeichenStelle = message.argument.indexOf(" ");
        if ( leerzeichenStelle == -1 ) {
          kanal = message.argument;
        } else {
          kanal = message.argument.substring(0, leerzeichenStelle);
        }
        if ( kanal.startsWith("@") ) {
          kanal = kanal.substring(1);
        }
        if ( botRaum[kanal] != undefined ) {
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + kanal + " ist bereits im botRaum."
          });
        } else {
          //Zum Raum einladen
          join( kanal );
          sende( kanal, "Ihr Kanal hat eine Einladung erhalten dem dinoagw_bot-Raum beizutreten. Schreibe \"@dinoagw_bot ja_bot\" um die Einladung anzunehmen." );
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " Anfrage an " + kanal + " gesendet."
          });
          warteRaum[kanal] = 1;
          process.send({
            type: konstanten.erinnereMich,
            time: timeTillTimeout,
            nachricht: {
              type: konstanten.erinnereMich,
              username: message.username,
              target: message.target,
              kanal: kanal,
            }
          });
        }
      } else {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen."
        });
      }
    }
    if ( message.prefix == "!stopallbot" ) {
      if ( message.isAdmin ) {
        warteRaum = [];
        for ( let iter in botRaum ) {
          sende( iter, message.username + " beendet die dinoagw_bot-Anbindung für alle Kanäle." );
          part( iter );
        }
        botRaum = [];
        process.send({
          type: konstanten.datenbankEingabe,
          query: "UPDATE bot SET raum = 0",
          variables: [ ]
        });
      } else {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen."
        });
      }
    }
    if ( message.prefix == "!kickbot" ) {
      if ( message.isAdmin ) {
        //beende die Synchronisation für jemand Anderen
        let kanal;
        let leerzeichenStelle = message.argument.indexOf(" ");
        if ( leerzeichenStelle == -1 ) {
          kanal = message.argument;
        } else {
          kanal = message.argument.substring(0, leerzeichenStelle);
        }
        let raum = botRaum[kanal];
        if ( raum != undefined ) {
          delete botRaum[kanal];
          sende( kanal, message.username + " beendet die dinoagw_bot-Anbindung für diesen Kanal." );
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + kanal + " Wurde aus dem dinoagw_bot-Raum entfernt."
          });
          part( message.target );
          process.send({
            type: konstanten.datenbankEingabe,
            query: "UPDATE bot SET raum = 0 WHERE kanal = ?",
            variables: [ kanal ]
          });
        } else {
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + kanal + " ist nicht am dinoagw_bot angebunden."
          });
        }
      } else {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen."
        });
      }
    }
    if ( message.prefix == "!botstatus" ) {
      if ( message.isAdmin ) {
        let leer = true;
        for ( iter in warteRaum ) {
          leer = false;
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + iter + " wartet im Warteraum."
          });
        }
        for ( iter in botRaum ) {
          leer = false;
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + iter + " ist am dinoagw_bot angebunden."
          });
        }
        if ( leer ) {
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " Die Warte- und BotRäume sind alle leer."
          });
        }
      } else {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen."
        });
      }
    }
  }
  if ( message.type == konstanten.empfangeVonTwitchChat ) {
    console.log( scriptname, "empfangeVonTwitch", message.script, message.username, message.target, message.context.username, message.msg );
    empfange( message.target, message.context, message.msg );
  }
});

process.send({
  type: konstanten.anwesend,
  prefixe: myPrefixe
});
let anfrage = {
  id: 0
};
offeneAnfragen.push(anfrage);
process.send({
  type: konstanten.datenbankAbfrage,
  anfragenID: 0,
  query: "SELECT * FROM bot",
  variables: [ ]
});

function join( kanal ) {
  process.send({
    type: konstanten.joinTwitchChat,
    script: "more_dinoagw_bot",
    username: "dinoagw_bot",
    target: kanal,
  });
}

function part( kanal ) {
  process.send({
    type: konstanten.partTwitchChat,
    script: "more_dinoagw_bot",
    username: "dinoagw_bot",
    target: kanal
  });
}

function sende(target, nachricht) {
  process.send({
    type: konstanten.sendeAnTwitchChat,
    script: "more_dinoagw_bot",
    username: "dinoagw_bot",
    target: target,
    nachricht: nachricht
  });
}
