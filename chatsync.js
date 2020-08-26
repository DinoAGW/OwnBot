const admins = ["dinoagw"];
const DEBUG = false;

const pwd = require('./Passwort.js');

const konstanten = require('./Konstanten.js');
const myPrefixe = [
  "!invite",
  "!stopallsync",
  "!sync",
  "!kick",
  "!syncstatus"
];

const scriptname = "chatsync:";

const fork = require('child_process').fork;

const timeTillTimeout = 30;

var eineAnfragenID = 1;
var offeneAnfragen = [];

var warteRaum = [];
var chatRaum = [];

var kinder = {};
var prefixe = {};

erzeuge( "twitchChat" );
kinder["twitchChat"].send({
  type: konstanten.starteTwitchChat,
  username: "chatsync",
  password: pwd.chatsync,
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

  if ( prefix == "!stopsync" ) {
    if ( isAdmin || isStreamer || isMod ) {
      let kanal = target;
      let raum = chatRaum[kanal];
      if ( raum != undefined ) {
        delete chatRaum[kanal];
        process.send({
          type: konstanten.sendeAnChat,
          target: target,
          nachricht: "@" + username + " Der Kanal verlässt nun den Chatraum #" + raum
        });
        part( target );
        process.send({
          type: konstanten.datenbankEingabe,
          query: "UPDATE sync SET raum = 0 WHERE kanal = ?",
          variables: [ kanal ]
        });
      }
    }
  }
  if ( prefix == "!multi" ) {
    let raum = chatRaum[target];
    if ( raum != undefined ) {
      let rundmail = "Hier: https://multistre.am";
      for( iter in chatRaum ) {
        if ( chatRaum[iter] == raum ) {
          rundmail += "/" + iter;
        }
      }
      rundmail += " könnt Ihr uns gemeinsam schauen";
      process.send({
        type: konstanten.sendeAnChat,
        target: target,
        nachricht: rundmail
      });
    };
  }
  if ( prefix == "@dinoagw_bot" ) {
    if ( isAdmin || isStreamer || isMod ) {
      if ( argument.startsWith("ja") ) {
        let kanal = target;
        let raum = warteRaum[kanal];
        if ( raum != undefined ) {
          delete warteRaum[kanal];
          chatRaum[kanal] = raum;
          process.send({
            type: konstanten.sendeAnChat,
            target: target,
            nachricht: "@" + username + " Ihr Kanal betritt nun Chatraum #" + raum
          });
          process.send({
            type: konstanten.datenbankEingabe,
            query: "REPLACE INTO sync (kanal, raum) VALUES (?, ?)",
            variables: [ kanal, raum ]
          });
        }
      }
    } else {
      process.send({
        type: konstanten.sendeAnChat,
        target: target,
        nachricht: "@" + username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen."
      });
    }
  }
  //die eigentliche Funktionalität
  let kanal = target;
  if ( !geheim && chatRaum[kanal]>0 ) {
    let raum = chatRaum[kanal];
    for ( iter in chatRaum ) {
      if ( iter != kanal && chatRaum[iter] == raum ) {
        sende( iter, username + ": " + nachricht.substring(0, 255) );
      }
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
  child.on('message', async (message) => {
    if ( DEBUG ) console.log("Kind schreibt: ", message);
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
    if ( message.type == konstanten.empfangeVonTwitchChat ) {
      empfange( message.target, message.context, message.msg );
    }
  });
  child.on('error', (err) => {
    console.log(kind + " gibt einen Fehler aus: " + err);
    delete kinder[kind];
    delete prefixe[kind];
  });
  kinder[kind] = child;
  return child;
}

process.on('message', (message) => {
  if ( DEBUG ) console.log( scriptname, "Message:", message );
  if ( message.type == konstanten.erinnereMich ) {
    //Anfrage Timeout
    if ( warteRaum[message.kanal] == message.raum ) {
      delete warteRaum[message.kanal];
      process.send({
        type: konstanten.sendeAnChat,
        target: message.kanal,
        nachricht: "timeout"
      });
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
          chatRaum[message.res[iter].kanal] = message.res[iter].raum;
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
    if ( message.prefix == "!invite" ) {
      if ( message.isAdmin || message.isStreamer || message.isMod ) {
        let kanal;
        let raum;
        let leerzeichenStelle = message.argument.indexOf(" ");
        if ( leerzeichenStelle == -1 ) {
          kanal = message.argument;
          raum = chatRaum[message.target];
        } else {
          kanal = message.argument.substring(0, leerzeichenStelle);
          raum = parseInt(message.argument.substring(leerzeichenStelle+1), 10);
        }
        if ( kanal.startsWith("@") ) {
          kanal = kanal.substring(1);
        }
        if ( !message.isAdmin ) {
          raum = chatRaum[message.target];
        }
        if ( isNaN(raum) || raum<1 ) {
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " Der Befehl wird wie folgt genutzt: !invite Kanal Raum"
          });
        } else {
          if ( chatRaum[kanal] == raum ) {
            process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + kanal + " ist bereits im Raum #" + raum
          });
          } else {
            //Zum Raum einladen
            join( kanal );
            process.send({
              type: konstanten.sendeAnChat,
              target: kanal,
              nachricht: "Ihr Kanal hat eine Einladung erhalten den Chatraum #" + raum + " zu betreten. Schreibe \"@dinoagw_bot ja\" um die Einladung anzunehmen."
            });
            process.send({
              type: konstanten.sendeAnChat,
              target: message.target,
              nachricht: "@" + message.username + " Anfrage an " + kanal + " gesendet."
            });
            warteRaum[kanal] = raum;
            process.send({
              type: konstanten.erinnereMich,
              time: timeTillTimeout,
              nachricht: {
                type: konstanten.erinnereMich,
                username: message.username,
                target: message.target,
                kanal: kanal,
                raum: raum
              }
            });
          }
        }
      } else {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen."
        });
      }
    }
    if ( message.prefix == "!stopallsync" ) {
      if ( message.isAdmin ) {
        warteRaum = [];
        for ( let iter in chatRaum ) {
          process.send({
            type: konstanten.sendeAnChat,
            target: iter,
            nachricht: message.username + " hat die Synchronisation für alle beendet."
          });
          part( iter );
        }
        chatRaum = [];
        process.send({
          type: konstanten.datenbankEingabe,
          query: "UPDATE sync SET raum = 0",
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
    if ( message.prefix == "!sync" ) {
      if ( message.isAdmin || message.isStreamer || message.isMod ) {
        let raum;
        if ( message.isAdmin && message.argument != "" ) {
          raum = parseInt(message.argument, 10);
        } else {
          raum = 1;
          for ( let iter in chatRaum ) {
            if ( chatRaum[iter] >= raum ) {
              raum = chatRaum[iter]+1;
            }
          }
        }
        //verbinde mit Raum #
        if ( isNaN(raum) || raum<1 ) {
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " Der Befehl wird wie folgt genutzt: !sync Raum"
          });
        } else {
          chatRaum[message.target] = raum;
          join( message.target );
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " Ihr Kanal betritt nun Chatraum #" + raum
          });
          process.send({
            type: konstanten.datenbankEingabe,
            query: "REPLACE INTO sync (kanal, raum) VALUES (?, ?)",
            variables: [ message.target, raum ]
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
    if ( message.prefix == "!kick" ) {
      if ( message.isAdmin || message.isStreamer || message.isMod ) {
        //beende die Synchronisation für jemand Anderen
        let kanal;
        let leerzeichenStelle = message.argument.indexOf(" ");
        if ( leerzeichenStelle == -1 ) {
          kanal = message.argument;
        } else {
          kanal = message.argument.substring(0, leerzeichenStelle);
        }
        let raum = chatRaum[kanal];
        if ( raum != undefined && ( message.isAdmin || chatRaum[message.target] == raum )) {
          delete chatRaum[kanal];
          process.send({
            type: konstanten.sendeAnChat,
            target: kanal,
            nachricht: "Ihr Kanal wurde aus dem Chatraum #" + raum + " entfernt."
          });
          part( message.target );
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + kanal + " Wurde aus dem Chatraum #" + raum + " entfernt."
          });
          process.send({
            type: konstanten.datenbankEingabe,
            query: "UPDATE sync SET raum = 0 WHERE kanal = ?",
            variables: [ kanal ]
          });
        } else {
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + kanal + " ist in keinem Chatraum."
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
    if ( message.prefix == "!syncstatus" ) {
      if ( message.isAdmin ) {
        let leer = true;
        for ( iter in warteRaum ) {
          leer = false;
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + iter + " wartet im Warteraum #" + warteRaum[iter]
          });
        }
        for ( iter in chatRaum ) {
          leer = false;
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " " + iter + " sitzt im Chatraum #" + chatRaum[iter]
          });
        }
        if ( leer ) {
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " Die Warte- und Chaträume sind alle leer."
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
});

process.send({
  type: konstanten.anwesend,
  prefixe: myPrefixe
});
let anfrage = {
  id: 0
};
offeneAnfragen.push(anfrage);
setTimeout( () => {
  process.send({
    type: konstanten.datenbankAbfrage,
    anfragenID: 0,
    query: "SELECT * FROM sync",
    variables: [ ]
  });
}, 1000);

function join( kanal ) {
  kinder["twitchChat"].send({
    type: konstanten.joinTwitchChat,
    target: kanal
  });
}

function part( kanal ) {
  kinder["twitchChat"].send({
    type: konstanten.partTwitchChat,
    target: kanal
  });
}

function sende(target, nachricht) {
  kinder["twitchChat"].send({
    type: konstanten.sendeAnTwitchChat,
    target: target,
    nachricht: nachricht
  });
}
