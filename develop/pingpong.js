const konstanten = require('./Konstanten.js');

const prefixe = [
  "!ping",
  "!pong"
];

const DEBUG = true;

const timeTillTimeout = 90;

var eineAnfragenID = 0;
var offeneAnfragen = [];

//für jeden Kanal ein Spiel gleichzeitig
var offeneDuelle = {}; //ein leeres Objekt

process.on('message', (message) => {
  if ( DEBUG ) console.log("Kind erhalten: ", message );
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      console.log("Kind: Beende mich nun");
      process.exit();
    }
    //falls jemand ping oder pong schreibt
    if ( message.prefix == "!ping" || message.prefix == "!pong" ) {
      if ( offeneDuelle[message.target] != undefined && message.prefix == offeneDuelle[message.target].lastBefehl ) {
        //Wiederholungen können ignoriert werden
      } else {
        //Jemand will ein Match starten oder daran teilnehmen, aber kann er es sich leisten?
        if ( DEBUG ) console.log("ping/pong erhalten:", message.username);
        let id = eineAnfragenID++;
        let anfrage = {
          id: id,
          username: message.username,
          befehl: message.prefix,
          target: message.target
        };
        process.send({
          type: konstanten.datenbankAbfrage,
          anfragenID: id,
          query: "UPDATE punkte SET punkte=punkte-1,einsatz=einsatz+1  WHERE name=? AND punkte>=1",
          variables: [ message.username ]
        });
        offeneAnfragen.push(anfrage);
      }
    }
  }
  if ( message.type == konstanten.datenbankAntwort ) {
    if ( DEBUG ) console.log("Datenbankantwort #"+message.anfragenID+" erhalten: ", message );
    let anfrage;
    for (iter in offeneAnfragen) {
      if ( offeneAnfragen[iter].id == message.anfragenID ) {
        anfrage = offeneAnfragen[iter];
        offeneAnfragen.splice(iter, 1);
        break;
      }
      //wenn keine passende Anfrage gefunden wurde, was soll dann geschehen?
    }
    if ( DEBUG ) console.log("Anfrage: ", anfrage);
    if ( message.res.affectedRows == 1) {
      //er kann sich ein Duell leisten
      if ( offeneDuelle[anfrage.target] == undefined ) {
        //es beginnt ein neues Duell
        let duell = {
          letzterUser: anfrage.username,
          lastBefehl: anfrage.befehl,
          target: anfrage.target,
          einsatz: 1,
          einsaetze: {}
        };
        duell.einsaetze[anfrage.username] = 1;
        offeneDuelle[anfrage.target] = duell;
        process.send({
          type: konstanten.sendeAnChat,
          target: anfrage.target,
          nachricht: "@" + anfrage.username + " Hat ein PingPong-Match begonnen."
        });
        process.send({
          type: konstanten.erinnereMich,
          time: timeTillTimeout,
          nachricht: {
            type: konstanten.erinnereMich,
            duell: duell
          }
        });
      } else {
        //er nimmt am Duell teil
        offeneDuelle[anfrage.target].letzterUser = anfrage.username;
        offeneDuelle[anfrage.target].lastBefehl = anfrage.befehl;
        if ( offeneDuelle[anfrage.target].einsaetze[anfrage.username] == undefined ) {
          offeneDuelle[anfrage.target].einsaetze[anfrage.username] = 1;
        } else {
          offeneDuelle[anfrage.target].einsaetze[anfrage.username]++;
        }
        offeneDuelle[anfrage.target].einsatz++;
        process.send({
          type: konstanten.sendeAnChat,
          target: anfrage.target,
          nachricht: "@" + anfrage.username + " schlägt " + anfrage.befehl
        });
        process.send({
          type: konstanten.erinnereMich,
          time: timeTillTimeout,
          nachricht: {
            type: konstanten.erinnereMich,
            duell: offeneDuelle[anfrage.target]
          }
        });
      }
    } else {
      //er kann sich den Start oder die Teilnahme nicht leisten
      process.send({
        type: konstanten.sendeAnChat,
        target: anfrage.target,
        nachricht: "@" + anfrage.username + " Du hast nicht genug Dinos."
      });
    }
  }
  //nach Ablauf der 90 Sekunden
  if ( message.type == konstanten.erinnereMich ) {
    if ( DEBUG ) console.log("Erinnerung message:", message);
    if ( message.duell.einsatz < offeneDuelle[message.duell.target].einsatz ) {
      //es wurde rechtzeitig darauf reagiert
    } else {
      if ( message.duell.einsatz == message.duell.einsaetze[message.duell.letzterUser] ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.duell.target,
          nachricht: "@" + message.duell.letzterUser + ": sorry, leider will gerade niemand mitspielen. Nimms bitte nicht persönlich."
        });
      } else {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.duell.target,
          nachricht: "@" + message.duell.letzterUser + " gewinnt " + (message.duell.einsatz-message.duell.einsaetze[message.duell.letzterUser]) + " Dinos!"
        });
        for ( username in message.duell.einsaetze ) {
          process.send({
            type: konstanten.datenbankEingabe,
            query: "UPDATE punkte SET einsatz = einsatz-"+message.duell.einsaetze[username]+" WHERE name = ?",
            variables: [ username ]
          });
        }        
        process.send({
          type: konstanten.datenbankEingabe,
          query: "UPDATE punkte SET punkte = punkte+"+message.duell.einsatz+" WHERE name = ?",
          variables: [ message.duell.letzterUser ]
        });
      }
      delete offeneDuelle[message.duell.target];
    }
  }
});

process.send({
  type: konstanten.anwesend,
  prefixe: prefixe
});

process.send({
  type: konstanten.datenbankEingabe,
  query: "UPDATE punkte SET punkte = punkte + einsatz, einsatz = 0 WHERE einsatz<>0",
  variables: [ ]
});
