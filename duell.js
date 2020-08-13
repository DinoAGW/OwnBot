const konstanten = require('./Konstanten.js');
const myKonstanten = {
  vorababfrage: 0,
  updatefrage: 1,
}
const prefixe = [
  "!duell"
];
const DEBUG = true;
const timeTillTimeout = 30;

var eineAnfragenID = 0;
var offeneAnfragen = [];

var offeneDuelle = [];

process.on('message', (message) => {
  if ( DEBUG ) console.log("Kind erhalten: ", message );
  if ( message.type == konstanten.erinnereMich ) {
    let gefunden = false;
    for ( iter in offeneDuelle ) {
      if ( offeneDuelle[iter].username == message.duell.username && offeneDuelle[iter].target == message.duell.target && offeneDuelle[iter].ziel == message.duell.ziel && offeneDuelle[iter].einsatz == message.duell.einsatz ) {
        offeneDuelle.splice(iter, 1);
        gefunden = true;
        break;
      }
    }
    if ( gefunden ) {
      process.send({
        type: konstanten.datenbankEingabe,
        query: "UPDATE punkte SET punkte = punkte+"+message.duell.einsatz+", einsatz = einsatz-"+message.duell.einsatz+" WHERE name = ?",
        variables: [ message.duell.username ]
      });
      process.send({
        type: konstanten.sendeAnChat,
        target: message.target,
        nachricht: "@" + message.duell.username + ": timeout."
      });
    } else {
      //normalfall
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
    }
    //wenn keine passende Anfrage gefunden wurde, was soll dann geschehen?
    if ( DEBUG ) console.log("Anfrage: ", anfrage);
    if ( anfrage.type == myKonstanten.updatefrage ) {
      if ( message.res.affectedRows == 1) {
        //er kann sich ein Duell leisten
        let duell;
        let gefunden = false;
        for ( iter in offeneDuelle ) {
          if ( anfrage.ziel == offeneDuelle[iter].username && anfrage.username == offeneDuelle[iter].ziel && anfrage.target == offeneDuelle[iter].target ) {
            duell = offeneDuelle[iter];
            offeneDuelle.splice(iter, 1);
            gefunden = true;
            break;
          }
        }
        if ( gefunden ) {
          //duell kann stattfinden
          let einsaetze = anfrage.einsatz + duell.einsatz;
          let random = Math.floor(Math.random()*einsaetze)
          let gewinner;
          let verlierer;
          if (random < anfrage.einsatz) {
            gewinner = anfrage;
            verlierer = duell;
          } else {
            gewinner = duell;
            verlierer = anfrage;
          }
          if ( DEBUG ) {
            console.log("Anfrage: ", anfrage);
            console.log("Duell: ", duell);
            console.log("Einsätze zusammen: ", einsaetze);
            console.log("Zufallszahl: ", random, " random<anfrage?");
            console.log("Gewinner: ", gewinner.username);
            console.log("Verlierer: ", verlierer.username);
          }
          process.send({
            type: konstanten.datenbankEingabe,
            query: "UPDATE punkte SET einsatz = einsatz-"+verlierer.einsatz+" WHERE name = ?",
            variables: [ verlierer.username ]
          });
          process.send({
            type: konstanten.datenbankEingabe,
            query: "UPDATE punkte SET einsatz = einsatz-"+gewinner.einsatz+", punkte = punkte+"+(verlierer.einsatz+gewinner.einsatz)+" WHERE name = ?",
            variables: [ gewinner.username ]
          });
          process.send({
            type: konstanten.sendeAnChat,
            target: anfrage.target,
            nachricht: "Der Gewinner ist: @" + gewinner.username + ". Sorry @" + verlierer.username + "."
          });
        } else {
          //duell merken
          let duell = {
            username: anfrage.username,
            target: anfrage.target,
            ziel: anfrage.ziel,
            einsatz: anfrage.einsatz
          }
          offeneDuelle.push(duell);
          process.send({
            type: konstanten.sendeAnChat,
            target: anfrage.target,
            nachricht: "@" + anfrage.ziel + " Du wurdest von @" + anfrage.username + " zu einem Duell herausgefordert."
          });
          process.send({
            type: konstanten.erinnereMich,
            time: timeTillTimeout,
            nachricht: {
              type: konstanten.erinnereMich,
              target: anfrage.target,
              duell: duell
            }
          });
        }
      } else {
        //er kann sich kein Duell leisten
        process.send({
          type: konstanten.sendeAnChat,
          target: anfrage.target,
          nachricht: "@" + anfrage.username + " Du hast nicht genug Dinos."
        });
      }
    }
  }
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      console.log("Kind: Beende mich nun");
      process.exit();
    }
    if ( message.prefix == "!duell" ) {
      let leerzeichenStelle = message.argument.indexOf(" ");
      if ( leerzeichenStelle == -1 || !message.argument.startsWith("@") ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Der Befehl wird wie folgt genutzt: !duell @Zielperson Einsatz (Zielperson = Person mit der du dich duellieren möchtest, Einsatz = wieviel Punkte Du einsetzen möchtest.)"
        });
      } else if ( message.argument.slice(1, leerzeichenStelle).toLowerCase()==message.username ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " - versuchst Du Dich hier selbst fertig zu machen? =D"
        });
      } else if ( message.argument.slice(1, leerzeichenStelle).toLowerCase()=="dinoagw_bot" ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " tut mir Leid, ich darf nicht (bin befangen) ='("
        });
      } else {
        let ziel = message.argument.slice(1, leerzeichenStelle).toLowerCase();
        let einsatz = message.argument.substring(leerzeichenStelle);
        leerzeichenStelle = einsatz.indexOf(" ");
        if ( leerzeichenStelle>0 ) {
          einsatz = einsatz.slice(0, leerzeichenStelle);
        }
        einsatz = parseInt(einsatz, 10);
        if ( isNaN(einsatz) || einsatz<1 ) {
          process.send({
            type: konstanten.sendeAnChat,
            target: message.target,
            nachricht: "@" + message.username + " Der Befehl wird wie folgt genutzt: !duell @Zielperson Einsatz (Zielperson = Person mit der du dich duellieren möchtest, Einsatz = wieviel Punkte Du einsetzen möchtest.)"
          });
        } else {
          if ( DEBUG ) console.log(message.username, einsatz);
          let id = eineAnfragenID++;
          let anfrage = {
            id: id,
            username: message.username,
            target: message.target,
            ziel: ziel,
            einsatz: einsatz,
            type: myKonstanten.updatefrage
          };
          process.send({
            type: konstanten.datenbankAbfrage,
            anfragenID: id,
            query: "UPDATE punkte SET punkte=punkte-"+einsatz+",einsatz=einsatz+"+einsatz+"  WHERE name=? AND punkte>="+einsatz,
            variables: [ message.username ]
          });
          offeneAnfragen.push(anfrage);
        }
      }
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
