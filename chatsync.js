const admins = ["dinoagw"];
const pwd = require('./Passwort.js');
const tmi = require('tmi.js');

const konstanten = require('./Konstanten.js');
const prefixe = [
  "!invite",
  "!stopallsync",
  "!sync",
  "!kick",
  "!syncstatus"
];

const DEBUG = false;
const scriptname = "chatsync:";

const opts = {
  identity: {
    username: "chatsync",
    password: pwd.chatsync
  },
  connection: {
    reconnect: true
  },
  channels: [
  ]
};
var client = new tmi.client(opts);
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.connect();

const timeTillTimeout = 30;

var eineAnfragenID = 1;
var offeneAnfragen = [];

var warteRaum = [];
var chatRaum = [];

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
      part( client, message.kanal );
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
          join(client, message.res[iter].kanal);
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
          raum = chatRaum[message.target.substring(1)];
        } else {
          kanal = message.argument.substring(0, leerzeichenStelle);
          raum = parseInt(message.argument.substring(leerzeichenStelle+1), 10);
        }
        if ( kanal.startsWith("@") ) {
          kanal = kanal.substring(1);
        }
        if ( !message.isAdmin ) {
          raum = chatRaum[message.target.substring(1)];
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
            join(client, kanal);
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
          part( client, iter );
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
          raum = 0;
          for ( iter in chatRaum ) {
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
          chatRaum[message.target.substring(1)] = raum;
          join(client, message.target);
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " Ihr Kanal betritt nun Chatraum #" + raum
          });
          process.send({
            type: konstanten.datenbankEingabe,
            query: "REPLACE INTO sync (kanal, raum) VALUES (?, ?)",
            variables: [ message.target.substring(1), raum ]
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
        if ( raum != undefined && ( message.isAdmin || chatRaum[message.target.substring(1)] == raum )) {
          delete chatRaum[kanal];
          process.send({
            type: konstanten.sendeAnChat,
            target: kanal,
            nachricht: "Ihr Kanal wurde aus dem Chatraum #" + raum + " entfernt."
          });
          part( client, message.target );
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
  prefixe: prefixe
});

function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  
  if (context.username == client.getUsername()) {
	  console.log( scriptname, "kann wirklich passieren");
	  return;
  }
  var nachricht = msg.trim();
  var geheim = false;
  if ( nachricht.startsWith("~") || nachricht.startsWith("!") ) {
    geheim = true;
    nachricht = nachricht.substring(1);
  }
  if (context.username == "dinoagw_bot") geheim = true;
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
  if ( "#" + username == target ) {
    isStreamer = true;
  }
  var isMod = context.mod;
  var isAdmin = admins.includes(username);

  if ( prefix == "!stopsync" ) {
    if ( isAdmin || isStreamer || isMod ) {
      let kanal = target.substring(1);
      let raum = chatRaum[kanal];
      if ( raum != undefined ) {
        delete chatRaum[kanal];
        process.send({
          type: konstanten.sendeAnChat,
          target: target,
          nachricht: "@" + username + " Der Kanal verlässt nun den Chatraum #" + raum
        });
        part( client, target );
        process.send({
          type: konstanten.datenbankEingabe,
          query: "UPDATE sync SET raum = 0 WHERE kanal = ?",
          variables: [ kanal ]
        });
      }
    }
  }
  if ( prefix == "!multi" ) {
    let raum = chatRaum[target.substring(1)];
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
        let kanal = target.substring(1)
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
  let kanal = target.substring(1);
  if ( !geheim && chatRaum[kanal]>0 ) {
    let raum = chatRaum[kanal];
    for ( iter in chatRaum ) {
      if ( iter != kanal && chatRaum[iter] == raum ) {
        sende( iter, username + ": " + nachricht.substring(0, 255) );
      }
    }
  }
}

function join(client, kanal) {
  if ( !kanal.startsWith("#") ) {
    kanal = "#" + kanal;
  }
  client.join( kanal )
  .then(
    (data) => {console.log(scriptname, `join data = ${data}`);}
  )
  .catch(
    (err) => {console.log(scriptname, `join err = ${err}`);}
  );
}

function part(client, kanal) {
  if ( !kanal.startsWith("#") ) {
    kanal = "#" + kanal;
  }
  client.part( kanal )
  .then(
    (data) => {console.log(scriptname, `part data = ${data}`);}
  )
  .catch(
    (err) => {console.log(scriptname, `part err = ${err}`);}
  );
}

function sende(target, nachricht) {
  if ( !target.startsWith("#") ) {
    target = "#" + target;
  }
  try {
    client.say(target, nachricht)
      .then(
        (data) => {if ( DEBUG ) console.log(scriptname, `gesendet data = ${data}`);}
      )
      .catch(
        (err) => {console.log(scriptname, `gesendet err = ${err}`);}
      );
  } catch(err) {
    console.log(`* err = ${err}`);
  }
}

function onConnectedHandler (addr, port) {
  console.log( scriptname, `Connected to ${addr}:${port}`);
  let anfrage = {
    id: 0
  };
  offeneAnfragen.push(anfrage);
  process.send({
    type: konstanten.datenbankAbfrage,
    anfragenID: 0,
    query: "SELECT * FROM sync",
    variables: [ ]
  });
}
