const konstanten = require('./Konstanten.js');
const myKonstanten = {
  vorababfrage: 0,
  updatefrage: 1,
}
const prefixe = [
  "!rennen",
  "!duell"
];
const DEBUG = false;
const timeTillTimeout = 90;

var eineAnfragenID = 0;
var offeneAnfragen = [];

var eineDuellId = 0;
var offeneDuelle = [];

process.on('message', (message) => {
  if ( DEBUG ) console.log("Kind erhalten: ", message );
  if ( message.type == konstanten.erinnereMich ) {
    let gefunden = false;
    for ( iter in offeneDuelle ) {
      if ( offeneDuelle[iter].id == message.duell.id ) {
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
          if (random < duell.einsatz) {
            gewinner = duell;
            verlierer = anfrage;
          } else {
            gewinner = anfrage;
            verlierer = duell;
          }
          if ( DEBUG ) {
            console.log("Anfrage: ", anfrage);
            console.log("Duell: ", duell);
            console.log("Einsätze zusammen: ", einsaetze);
            console.log("Zufallszahl: ", random, " random<duell?");
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
            nachricht: "Es wurden " + einsaetze + " Dinos ins Rennen geschickt. Dino #1-" + duell.einsatz + " ist von " + duell.username + ", Dino #" + (duell.einsatz+1) + "-" + einsaetze + " ist von " + anfrage.username + ". Gewonnen hat das Dino mit der Nummer " + (random+1) + ". @" + gewinner.username + " gewinnt " + verlierer.einsatz + " Dinos. Sorry @" + verlierer.username + "." 
            //nachricht: duell.username + " setzt " + duell.einsatz + " Dinoeier, " + anfrage.username + " setzt " + anfrage.einsatz + ". Aber befruchtet ist nur das Ei Nummer " + (random+1) + ". @" + gewinner.username + " gewinnt " + verlierer.einsatz + " Dinos. Sorry @" + verlierer.username + "." 
            //nachricht: "Ergebnis im Kampf " + anfrage.einsatz + " gegen " + duell.einsatz + ": " + random + ". @" + gewinner.username + " gewinnt " + verlierer.einsatz + " Dinos. Sorry @" + verlierer.username + "."
          });
        } else {
          //duell merken
          let id = eineDuellId++;
          let duell = {
            id: id,
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
      if ( message.argument.startsWith("@") ) {
        message.argument = message.argument.substring(1);
      }
      let leerzeichenStelle = message.argument.indexOf(" ");
      if ( leerzeichenStelle == -1 ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Der Befehl wird wie folgt genutzt: !duell @Zielperson Einsatz (Zielperson = Person mit der du dich duellieren möchtest, Einsatz = wieviel Punkte Du einsetzen möchtest.)"
        });
      } else if ( message.argument.slice(0, leerzeichenStelle).toLowerCase()==message.username ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " - versuchst Du Dich hier selbst fertig zu machen? =D"
        });
      } else if ( message.argument.slice(0, leerzeichenStelle).toLowerCase()=="dinoagw_bot" ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " tut mir Leid, ich darf nicht (bin befangen) ='("
        });
      } else {
        let ziel = message.argument.slice(0, leerzeichenStelle).toLowerCase();
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
